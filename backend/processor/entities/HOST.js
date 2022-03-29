const { batchEntityQuery, fetchPricing, roundHalf } = require('./utils');

const BASE_URL = 'https://nr1-cloud-optimize.s3.ap-southeast-2.amazonaws.com';

const SystemSampleQuery = `FROM SystemSample SELECT \
                                      latest(timestamp), latest(provider.instanceLifecycle), \
                                      latest(entityGuid), latest(apmApplicationNames), latest(providerAccountName), latest(hostname), latest(configName), \
                                      latest(awsRegion), latest(regionName), latest(zone), latest(regionId), latest(ec2InstanceId), latest(ec2InstanceType), latest(instanceType),\
                                      latest(coreCount), latest(processorCount), latest(memoryTotalBytes), latest(diskTotalBytes), latest(operatingSystem), \
                                      max(cpuPercent), max(memoryUsedBytes), max(memoryUsedBytes/memoryTotalBytes)*100 as 'max.memoryPercent' LIMIT 1`;

const NetworkSampleQuery = `FROM NetworkSample SELECT max(receiveBytesPerSecond), max(transmitBytesPerSecond) FACET interfaceName`;

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

exports.run = (entities, key, config, timeNrql, totalPeriodMs) => {
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
      cpuRightSize: HOST?.cpuRightSize || 0.5,
      memRightSize: HOST?.memRightSize || 0.5,
      cpuMemUpperOperator: HOST?.cpuMemUpperOperator || 'AND',
      cpuUpper: HOST?.cpuUpper || 50,
      memUpper: HOST?.memUpper || 50,
      cpuMemUpperStaleOperator: HOST?.cpuMemUpperStaleOperator || 'AND',
      staleCpu: HOST?.staleCpu || 5,
      staleMem: HOST?.staleMem || 5,
      rxTxStaleOperator: HOST?.rxTxStaleOperator || 'AND',
      staleReceiveBytesPerSec: HOST?.staleReceiveBytesPerSec || 5,
      staleTransmitBytesPerSec: HOST?.staleTransmitBytesPerSec || 5,
      lastReportPeriod: HOST?.lastReportPeriod || 24,
      inclusionPeriodHours: HOST?.inclusionPeriodHours || 24,
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
          SystemSample: nrdbQuery(nrql: "${SystemSampleQuery} ${timeNrql}") {
            results
          }
          NetworkSample: nrdbQuery(nrql: "${NetworkSampleQuery} ${timeNrql}") {
            results
          }
        }
      }
    }`;

    batchEntityQuery(key, query, entities, config).then(async entityData => {
      const pricing = {
        amazon: {},
        azure: {},
        google: {},
        alibaba: {}
      };

      pricing[conf.cloud][conf.regions[conf.cloud]] = null;

      // massage entity data
      entityData.forEach(e => {
        // move samples top level
        const SystemSample = e?.SystemSample?.results?.[0] || {};

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
        e.SystemSample.memoryGb = SystemSample.memoryTotalBytes * 1e-9;

        e.isSpot =
          SystemSample?.['provider.instanceLifecycle'] === 'spot' || false;

        const NetworkSample = e?.NetworkSample?.results?.[0] || {};
        e.NetworkSample = NetworkSample;

        const { awsRegion, regionName, zone, regionId } = SystemSample;

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
      });

      // get cloud pricing
      const pricingPromises = Object.keys(pricing)
        .map(cloud =>
          Object.keys(pricing[cloud]).map(region =>
            fetchPricing(
              `${BASE_URL}/${cloud}/compute/pricing/${region}.json`,
              cloud,
              region
            )
          )
        )
        .flat();

      await Promise.all(pricingPromises).then(pricingValues => {
        pricingValues.forEach(pv => {
          const { cloud, region, priceData } = pv;
          // sort on demand pricing low to high
          pricing[cloud][region] = priceData.products.sort(
            (a, b) => a.onDemandPrice - b.onDemandPrice
          );
        });
      });

      // determine instance and pricing
      entityData.forEach(e => {
        e.matches = { exact: [] };
        const selectedType =
          e.SystemSample.instanceType ||
          e.tags?.instanceType?.[0] ||
          e.tags?.type?.[0];

        const { memoryGb, coreCount } = e.SystemSample;

        const mem = Math.round(memoryGb);
        const cpu = coreCount;

        const cloudPrices =
          pricing?.[e.cloud || conf.cloud]?.[
            e.cloudRegion || conf.regions[conf.cloud]
          ];
        if (cloudPrices) {
          // attempt to find exact match
          if (e.cloud) {
            for (let z = 0; z < cloudPrices.length; z++) {
              if (selectedType && cloudPrices[z].type === selectedType) {
                e.matches.exact.push(simplifyProduct(cloudPrices[z]));
              }
            }
          }

          // attempt to find closest match if no exact matches from each category
          if (e.matches.exact.length === 0) {
            e.matches.closest = {};
            for (let z = 0; z < cloudPrices.length; z++) {
              const { cpusPerVm, memPerVm, category } = cloudPrices[z];
              if (cpusPerVm >= cpu && memPerVm >= mem) {
                if (!e.matches.closest[category]) {
                  e.matches.closest[category] = simplifyProduct(cloudPrices[z]);
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
              const { cpu, memory } = e.matches.exact?.[0];
              const cpuCount = parseFloat(
                cpu || e.SystemSample['latest.coreCount']
              );
              const memGb = parseFloat(
                memory || e.SystemSample['latest.memoryTotalBytes'] * 1e-9
              );

              const optimizedCpuCount = roundHalf(cpuCount * cpuRightSize);
              const optimizedMemGb = roundHalf(memGb * memRightSize);

              const onDemandPriceExact = e.matches.exact?.[0]?.onDemandPrice;

              e.matches.optimized = [];
              for (let z = 0; z < cloudPrices.length; z++) {
                const { cpusPerVm, memPerVm, onDemandPrice } = cloudPrices[z];
                if (
                  cpusPerVm >= optimizedCpuCount &&
                  memPerVm >= optimizedMemGb
                ) {
                  if (
                    !onDemandPriceExact ||
                    (onDemandPriceExact && onDemandPriceExact > onDemandPrice)
                  ) {
                    if (!e.matches.optimized) {
                      e.matches.optimized = [];
                    }
                    e.matches.optimized.push(simplifyProduct(cloudPrices[z]));
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
            const onDemandPrice = e.matches.exact?.[0]?.onDemandPrice;
            e.optimizedPeriodCost = operatingHours * onDemandPrice;
          }
        } else {
          // handle no pricing?
        }
        //
      });

      resolve(entityData);
    });
  });
};
