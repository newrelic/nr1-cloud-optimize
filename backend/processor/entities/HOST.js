const {
  fetchAwsEc2Locations,
  fetchAwsEc2RegionPricing
} = require('../utils/AWS_HOST');
const {
  batchEntityQuery,
  fetchPricing,
  roundHalf,
  nrqlQuery
} = require('./utils');

const BASE_URL = 'https://nr1-cloud-optimize.s3.ap-southeast-2.amazonaws.com';

const SystemSampleQuery = `FROM SystemSample SELECT \
                                      latest(timestamp), latest(provider.instanceLifecycle), \
                                      latest(apmApplicationNames), latest(providerAccountName), latest(hostname), latest(fullHostname), latest(configName), latest(clusterName), \
                                      latest(awsRegion), latest(regionName), latest(zone), latest(regionId), latest(ec2InstanceId), latest(ec2InstanceType), latest(instanceType),\
                                      latest(coreCount), latest(processorCount), latest(memoryTotalBytes), latest(diskTotalBytes), latest(operatingSystem), \
                                      max(cpuPercent), max(memoryUsedBytes), max(memoryUsedBytes/memoryTotalBytes)*100 as 'max.memoryPercent' FACET entityGuid LIMIT 1`;

const NetworkSampleQuery = `FROM NetworkSample SELECT max(receiveBytesPerSecond), max(transmitBytesPerSecond) FACET interfaceName`;

const AnsibleSystemSampleQuery = `FROM AnsibleSystemSample SELECT \
                                      latest(timestamp), \
                                      latest(entity.guid) as 'entityGuid', latest(providerAccountName), latest(cluster), latest(datacenter), latest(esxiHostname), \
                                      latest(processorVcpus) as 'coreCount', latest(processorThreadsPerCore), latest(processorCores), latest(memoryTotalMB / 1024) as 'memoryGb', latest(operatingSystem), \
                                      max(cpuPercent), max(memoryTotalMB - memoryFreeMB)*1024*1024 as 'memoryUsedBytes', max((memoryTotalMB-memoryFreeMB)/memoryTotalMB)*100 as 'max.memoryPercent' FACET entity.guid LIMIT 1`;

const K8sContainerDataQuery = (hostname, fullHostname, timeRange) =>
  `FROM K8sContainerSample SELECT latest(containerName) as 'containerName', latest(containerImage) as 'imageName', latest(podName) as 'podName', \
  latest(cpuLimitCores) as 'cpuLimitCores', max(cpuUsedCores) as 'maxCpuUsedCores', max(cpuCoresUtilization) as 'maxCpuCoresUtilization', \
  latest(memoryLimitBytes) as 'memoryLimitBytes', max(memoryUsedBytes) as 'maxMemoryUsedBytes', max(memoryUtilization) as 'maxMemoryUtilization' \
  WHERE hostname = '${hostname}' OR host = '${hostname}' OR fullHostname = '${fullHostname}' FACET containerID, entityGuid LIMIT MAX ${timeRange}`;

const EcsContainerDataQuery = (hostname, fullHostname, timeRange) =>
  `FROM ContainerSample SELECT latest(ecsContainerName) as 'containerName', latest(imageName) as 'imageName', \
  latest(ecsClusterName) as 'ecsClusterName', latest(ecsContainerName) as 'ecsContainerName', latest(ecsTaskDefinitionFamily) as 'ecsTaskDefinitionFamily', \
  latest(cpuLimitCores) as 'cpuLimitCores', max(cpuUsedCores) as 'maxCpuUsedCores', max(cpuUsedCoresPercent) as 'maxCpuUsedCoresPercent', \
  latest(memorySizeLimitBytes) as 'memoryLimitBytes', max(memoryUsageBytes) as 'maxMemoryUsedBytes', max(memoryUsageLimitPercent) as 'maxMemoryUsageLimitPercent' \
  WHERE hostname = '${hostname}' OR host = '${hostname}' OR fullHostname = '${fullHostname}' FACET containerId, entityGuid LIMIT MAX ${timeRange}`;

const simplifyProduct = priceData => {
  const {
    onDemandPrice,
    spotPrice,
    cpusPerVm,
    memPerVm,
    gpusPerVm,
    ntwPerfCategory,
    category,
    type
  } = priceData;
  const result = {
    onDemandPrice,
    spotPrice,
    cpu: cpusPerVm,
    memory: memPerVm,
    category,
    type
  };

  if (gpusPerVm) result.gpu = gpusPerVm;
  if (ntwPerfCategory) result.ntwPerfCategory = ntwPerfCategory;

  return result;
};

const simplifyAwsProductV2 = priceData => {
  const memSplit = (priceData?.Memory || '').split(' ');
  const result = {
    onDemandPrice: priceData?.price,
    cpu: priceData?.vCPU,
    memory: memSplit[0],
    category: priceData?.['plc:InstanceFamily'],
    ntwPerfCategory: priceData?.['Network Performance'],
    type: priceData?.['Instance Type']
  };

  return result;
};

exports.run = (
  entities,
  key,
  config,
  timeNrql,
  totalPeriodMs,
  nerdGraphUrl
) => {
  const { HOST, defaultCloud, defaultRegions } = config;
  // milliseconds to hours - divide the time value by 3.6e+6
  const operatingHours = totalPeriodMs / 3.6e6;

  const conf = {
    cloud: defaultCloud || 'amazon',
    regions: {
      amazon: defaultRegions?.amazon || 'us-east-1',
      azure: defaultRegions?.azure || 'eastus',
      google: defaultRegions?.google || 'us-east1',
      alibaba: defaultRegions?.alibaba || 'us-east-1'
    },
    optimize: {
      cpuRightSize: parseFloat(HOST?.cpuRightSize || 0.5),
      memRightSize: parseFloat(HOST?.memRightSize || 0.5),
      cpuMemUpperOperator: HOST?.cpuMemUpperOperator || 'AND',
      cpuUpper: parseFloat(HOST?.cpuUpper || 50),
      memUpper: parseFloat(HOST?.memUpper || 50),
      cpuMemUpperStaleOperator: HOST?.cpuMemUpperStaleOperator || 'AND',
      staleCpu: parseFloat(HOST?.staleCpu || 5),
      staleMem: parseFloat(HOST?.staleMem || 5),
      rxTxStaleOperator: HOST?.rxTxStaleOperator || 'AND',
      staleReceiveBytesPerSec: parseFloat(HOST?.staleReceiveBytesPerSec || 5),
      staleTransmitBytesPerSec: parseFloat(HOST?.staleTransmitBytesPerSec || 5),
      lastReportPeriod: parseFloat(HOST?.lastReportPeriod || 24),
      inclusionPeriodHours: parseFloat(HOST?.inclusionPeriodHours || 24),
      includedInstanceTypes: HOST?.includedInstanceTypes || [],
      excludedInstanceTypes: HOST?.excludedInstanceTypes || []
    }
  };

  return new Promise(resolve => {
    const query = `query HostQuery($guids: [EntityGuid]!) {
      actor {
        entities(guids: $guids) {
          reporting
          alertSeverity
          name
          guid
          domain
          type
          entityType
          tags {
            key
            values
          }
          SystemSample: nrdbQuery(nrql: "${SystemSampleQuery} ${timeNrql}", timeout: 120) {
            results
          }
          NetworkSample: nrdbQuery(nrql: "${NetworkSampleQuery} ${timeNrql}", timeout: 120) {
            results
          }
          AnsibleSystemSample: nrdbQuery(nrql: "${AnsibleSystemSampleQuery} ${timeNrql}", timeout: 120) {
            results
          }
        }
      }
    }`;

    batchEntityQuery(key, query, entities, config, nerdGraphUrl).then(
      async entityData => {
        const pricing = {
          amazon: {},
          azure: {},
          google: {},
          alibaba: {}
        };

        const pricingV2 = {
          amazon: {}
        };

        pricing[conf.cloud][conf.regions[conf.cloud]] = null;

        const k8sHosts = [];
        const ecsHosts = [];

        // massage entity data
        entityData.forEach(e => {
          // move samples top level
          const SystemSample =
            e?.SystemSample?.results?.[0] ||
            e?.AnsibleSystemSample?.results?.[0] ||
            {};

          if (e?.AnsibleSystemSample?.results?.[0]) {
            delete e.AnsibleSystemSample;
            e['co.sourceEvent'] = 'AnsibleSystemSample';
          }

          // clean up keys
          Object.keys(SystemSample).forEach(key => {
            if (!SystemSample[key]) {
              delete SystemSample[key];
            } else if (key.startsWith('latest.')) {
              const newKey = key.replace('latest.', '');
              SystemSample[newKey] = SystemSample[key];
              delete SystemSample[key];
            }
          });
          e.SystemSample = SystemSample;
          e.SystemSample.memoryGb =
            e.SystemSample.memoryGb || SystemSample.memoryTotalBytes * 1e-9;

          e.isSpot =
            SystemSample?.['provider.instanceLifecycle'] === 'spot' || false;

          const NetworkSample = e?.NetworkSample?.results?.[0] || {};
          e.NetworkSample = NetworkSample;
          e.clusterName =
            e?.tags?.clusterName?.[0] ||
            e?.tags?.['label.KubernetesCluster']?.[0] ||
            e?.SystemSample?.clusterName;

          e.ecsCluster = e?.tags?.['tags.ecs-cluster']?.[0];

          if (e.ecsCluster) {
            e.ecs = true;
            ecsHosts.push({
              hostname: e?.SystemSample?.hostname,
              fullHostname: e?.SystemSample?.fullHostname,
              accountId: e.tags?.accountId?.[0],
              guid: e.guid
            });
          }

          let { awsRegion, regionName, zone, regionId } = SystemSample;

          awsRegion =
            awsRegion ||
            e?.tags?.['aws.awsRegion']?.[0] ||
            e?.tags?.['aws.region']?.[0] ||
            e?.tags?.awsRegion?.[0];
          regionName = regionName || e?.tags?.['azure.regionname']?.[0];
          zone = zone || e?.tags?.['gcp.zone']?.[0];
          regionId = regionId || e?.tags?.['alibaba.regionid']?.[0];

          if (awsRegion) {
            e.cloud = 'amazon';
            e.cloudRegion = awsRegion;
            delete e.awsRegion;
          } else if (regionName) {
            e.cloud = 'azure';
            e.cloudRegion = regionName;
            delete e.regionName;
          } else if (zone) {
            e.cloud = 'google';
            e.cloudRegion = zone;
            delete e.zone;
          } else if (regionId) {
            e.cloud = 'alibaba';
            e.cloudRegion = regionId;
            delete e.regionId;
          }

          if (pricing[e.cloud]) {
            pricing[e.cloud][e.cloudRegion] = null;
          }
          if (pricingV2[e.cloud]) {
            pricingV2[e.cloud][e.cloudRegion] = null;
          }

          // check if aks or eks k8s host
          if (
            e.clusterName ||
            e.name.startsWith('gke-') ||
            e.name.startsWith('aks-')
          ) {
            e.k8s = true;
            k8sHosts.push({
              hostname: e?.SystemSample?.hostname,
              fullHostname: e?.SystemSample?.fullHostname,
              accountId: e.tags?.accountId?.[0],
              guid: e.guid
            });
          } else {
            // check if standard k8s host
            const keys = Object.keys(e?.tags || {});
            for (let z = 0; z < keys.length; z++) {
              if (keys[z].includes('k8s') || keys[z].includes('kubernetes')) {
                e.k8s = true;
                k8sHosts.push({
                  hostname: e?.SystemSample?.hostname,
                  fullHostname: e?.SystemSample?.fullHostname,
                  accountId: e.tags?.accountId?.[0],
                  guid: e.guid
                });
                break;
              }
            }
          }
        });

        // get k8s data
        // the container sample has their own guids so we need to stitch the container data afterwards
        const k8sContainerPromises = k8sHosts.map(
          k =>
            new Promise(resolve => {
              nrqlQuery(
                key,
                parseInt(k.accountId),
                K8sContainerDataQuery(k.hostname, k.fullHostname, timeNrql),
                null,
                nerdGraphUrl
              ).then(data => {
                resolve({ data, hostname: k.hostname, guid: k.guid });
              });
            })
        );

        const k8sContainerData = await Promise.all(k8sContainerPromises);

        // get ecs data
        // the container sample has their own guids so we need to stitch the container data afterwards
        const ecsContainerPromises = ecsHosts.map(
          k =>
            new Promise(resolve => {
              nrqlQuery(
                key,
                parseInt(k.accountId),
                EcsContainerDataQuery(k.hostname, k.fullHostname, timeNrql),
                null,
                nerdGraphUrl
              ).then(data => {
                resolve({ data, hostname: k.hostname, guid: k.guid });
              });
            })
        );

        const ecsContainerData = await Promise.all(ecsContainerPromises);

        // AMAZON V2 PRICING FETCH
        const awsEc2Locations =
          Object.keys(pricingV2.amazon).length > 0
            ? await fetchAwsEc2Locations()
            : null;

        if (awsEc2Locations) {
          const { locationData } = awsEc2Locations;

          const awsPricingPromises = Object.keys(pricingV2.amazon).map(region =>
            fetchAwsEc2RegionPricing(region, locationData)
          );

          await Promise.all(awsPricingPromises).then(pricingValues => {
            pricingValues.forEach(value => {
              const { pricingData, region } = value;
              pricingV2.amazon[region] = pricingData;
            });
          });
        }

        // ---------------------------

        // V1 PRICING FETCH
        // get cloud pricing
        const pricingPromises = Object.keys(pricing)
          .map(cloud =>
            Object.keys(pricing[cloud]).map(region => {
              let adjustedRegion = region;

              if (cloud === 'google') {
                const regionSplit = region.split('-');
                adjustedRegion = `${regionSplit[0]}-${regionSplit[1]}`;
              } else if (cloud === 'azure') {
                adjustedRegion = region.toLowerCase();
              }

              return fetchPricing(
                `${BASE_URL}/${cloud}/compute/pricing/${adjustedRegion}.json`,
                cloud,
                region
              );
            })
          )
          .flat();
        // -----------------------------

        await Promise.all(pricingPromises).then(pricingValues => {
          pricingValues.forEach(pv => {
            const { cloud, region, priceData } = pv;
            if (cloud && region && priceData) {
              if (!pricing[cloud]) pricing[cloud] = {};

              // sort on demand pricing low to high
              pricing[cloud][region] = (priceData.products || []).sort(
                (a, b) => a.onDemandPrice - b.onDemandPrice
              );
            }
          });
        });

        // determine instance and pricing
        entityData.forEach(e => {
          if (e.k8s || e.k8sMaybe) {
            e.K8sContainerData =
              (k8sContainerData || []).find(d => d.guid === e.guid)?.data
                ?.results || [];
          }

          if (e.ecs) {
            e.EcsContainerData =
              (ecsContainerData || []).find(d => d.guid === e.guid)?.data
                ?.results || [];
          }

          e.matches = { exact: [] };
          const selectedType =
            e.SystemSample.instanceType ||
            e.tags?.instanceType?.[0] ||
            e.tags?.['aws.ec2.instanceType']?.[0] ||
            e.tags?.type?.[0];

          const { memoryGb, coreCount } = e.SystemSample;

          const mem = Math.round(memoryGb);
          const cpu = coreCount;

          const cloudPrices =
            pricing?.[e.cloud || conf.cloud]?.[
              e.cloudRegion || conf.regions[conf.cloud]
            ];

          const v2Pricing =
            pricingV2?.amazon?.[e.cloudRegion || conf.regions[conf.cloud]];

          if (e.cloud === 'amazon' && selectedType && v2Pricing) {
            // attempt amazon V2 price match
            for (let z = 0; z < v2Pricing.length; z++) {
              const product = v2Pricing[z];
              if (product['Instance Type'] === selectedType) {
                e.matches.exact.push(simplifyAwsProductV2(product));
              }
            }
          }

          if (cloudPrices) {
            // attempt to find exact match
            if (e.cloud) {
              // fallback on v1
              if (Object.keys(e.matches.exact).length === 0) {
                for (let z = 0; z < cloudPrices.length; z++) {
                  if (selectedType && cloudPrices[z].type === selectedType) {
                    e.matches.exact.push(simplifyProduct(cloudPrices[z]));
                  } else if (selectedType && e.cloud === 'azure') {
                    const { tier, instanceName } = cloudPrices[z].attributes;
                    if (
                      selectedType.toLowerCase() ===
                      `${tier}_${instanceName
                        .replaceAll(' ', '_')
                        .toLowerCase()}`
                    ) {
                      e.matches.exact.push(simplifyProduct(cloudPrices[z]));
                    }
                  }
                }
              }
            }

            // attempt to find closest match if no exact matches from each category
            if (e.matches.exact.length === 0) {
              e.matches.closest = {};

              if (e.cloud === 'amazon' && selectedType && v2Pricing) {
                // attempt amazon V2 price match
                for (let z = 0; z < v2Pricing.length; z++) {
                  const product = simplifyAwsProductV2(v2Pricing[z]);

                  if (product.cpu >= cpu && product.memory >= mem) {
                    if (!e.matches.closest[product.category]) {
                      e.matches.closest[product.category] = product;
                    }
                  }
                }
              }

              // fallback on v1
              if (Object.keys(e.matches.closest).length === 0) {
                for (let z = 0; z < cloudPrices.length; z++) {
                  const { cpusPerVm, memPerVm, category } = cloudPrices[z];
                  if (cpusPerVm >= cpu && memPerVm >= mem) {
                    if (!e.matches.closest[category]) {
                      e.matches.closest[category] = simplifyProduct(
                        cloudPrices[z]
                      );
                    }
                  }
                }
              }
            }

            const maxCpu = e.SystemSample['max.cpuPercent'];
            const maxMem = e.SystemSample['max.memoryPercent'];

            // check if instance is stale
            const {
              staleCpu,
              staleMem,
              cpuMemUpperStaleOperator,
              cpuUpper,
              memUpper,
              cpuMemUpperOperator,
              cpuRightSize,
              memRightSize
            } = conf.optimize;
            const cpuStale = staleCpu !== 0 && maxCpu < staleCpu;
            const memStale = staleCpu !== 0 && maxMem < staleMem;
            const cpuMemUpperStaleOp = cpuMemUpperStaleOperator || 'AND';

            if (
              (cpuMemUpperStaleOp === 'AND' && cpuStale && memStale) ||
              (cpuMemUpperStaleOp === 'OR' && (cpuStale || memStale))
            ) {
              e.matches.stale = true;
            }

            // if not stale check if optimization should occur
            if (!e.matches.stale) {
              // check if instance should be optimized and provide matches from each category
              const cpuOptimize = cpuUpper !== 0 && maxCpu < cpuUpper;
              const memOptimize = memUpper !== 0 && maxMem < memUpper;
              const cpuMemUpperOp = cpuMemUpperOperator || 'AND';

              if (
                (cpuMemUpperOp === 'AND' && cpuOptimize && memOptimize) ||
                (cpuMemUpperOp === 'OR' && (cpuOptimize || memOptimize))
              ) {
                // optimize
                const exact = e.matches.exact?.[0];
                const cpu = exact?.cpu;
                const memory = exact?.memory;

                const cpuCount = parseFloat(
                  cpu || e.SystemSample['latest.coreCount'] || 1
                );
                const memGb = parseFloat(
                  memory || e.SystemSample['latest.memoryTotalBytes'] * 1e-9
                );

                const optimizedCpuCount = roundHalf(cpuCount * cpuRightSize);
                const optimizedMemGb = roundHalf(memGb * memRightSize);

                const onDemandPriceExact = e.matches.exact?.[0]?.onDemandPrice;

                e.matches.optimized = [];

                if (e.cloud === 'amazon' && selectedType && v2Pricing) {
                  // attempt amazon V2 price match
                  for (let z = 0; z < v2Pricing.length; z++) {
                    const product = simplifyAwsProductV2(v2Pricing[z]);

                    if (
                      product.cpu >= optimizedCpuCount &&
                      product.memory >= optimizedMemGb
                    ) {
                      if (
                        !onDemandPriceExact ||
                        (onDemandPriceExact &&
                          onDemandPriceExact > product.onDemandPrice)
                      ) {
                        if (!e.matches.optimized) {
                          e.matches.optimized = [];
                        }
                        e.matches.optimized.push(product);
                      }
                    }
                  }
                }

                // fallback on v1
                if (Object.keys(e.matches.optimized).length === 0) {
                  for (let z = 0; z < cloudPrices.length; z++) {
                    const { cpusPerVm, memPerVm, onDemandPrice } = cloudPrices[
                      z
                    ];
                    if (
                      cpusPerVm >= optimizedCpuCount &&
                      memPerVm >= optimizedMemGb
                    ) {
                      if (
                        !onDemandPriceExact ||
                        (onDemandPriceExact &&
                          onDemandPriceExact > onDemandPrice)
                      ) {
                        if (!e.matches.optimized) {
                          e.matches.optimized = [];
                        }
                        e.matches.optimized.push(
                          simplifyProduct(cloudPrices[z])
                        );
                      }
                    }
                  }
                }
              }
            }

            if (e.matches.exact?.[0]) {
              const onDemandPrice = e.matches.exact?.[0]?.onDemandPrice;
              e.exactPeriodCost = operatingHours * onDemandPrice;
            }
            if (e.matches.optimized?.[0]) {
              const onDemandPrice = e.matches.optimized?.[0]?.onDemandPrice;
              e.optimizedPeriodCost = operatingHours * onDemandPrice;
            }
          } else {
            // handle no pricing?
          }
          //
        });

        resolve(entityData);
      }
    );
  });
};
