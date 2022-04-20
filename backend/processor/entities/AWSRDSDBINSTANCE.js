const { batchEntityQuery, fetchPricing } = require('./utils');

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const DbQuery = `SELECT \
max(provider.readThroughput.Maximum), max(provider.writeThroughput.Maximum), \
max(\`provider.networkReceiveThroughput.Maximum\`), max(\`provider.networkTransmitThroughput.Maximum\`), \
max(\`provider.readIops.Maximum\`), max(\`provider.writeIops.Maximum\`), \
min(provider.freeStorageSpaceBytes.Minimum), latest(provider.allocatedStorageBytes), \
max(provider.databaseConnections.Maximum), \
max(\`provider.readLatency.Maximum\`), max(\`provider.writeLatency.Maximum\`), \
max(\`provider.swapUsage\`), max(\`provider.swapUsageBytes.Maximum\`), \
max(provider.cpuUtilization.Maximum), max(provider.freeableMemoryBytes.Maximum) \
FROM DatastoreSample WHERE provider='RdsDbInstance' LIMIT 1`;

const metricDbQuery = `SELECT \
max(aws.rds.ReadThroughput), max(aws.rds.WriteThroughput), \
max(aws.rds.NetworkTransmitThroughput), max(aws.rds.NetworkReceiveThroughput), \
max(aws.rds.ReadIOPS), max(aws.rds.WriteIOPS), max(aws.rds.DatabaseConnections), \
max(aws.rds.allocatedStorageBytes), min(aws.rds.FreeStorageSpace), \
max(aws.rds.CPUUtilization), latest(aws.rds.engine), latest(aws.rds.engineVersion), latest(aws.rds.dbInstanceClass) \
FROM Metric LIMIT 1`;

const pricingUrl = (region, type, engine) =>
  `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/rds/pricing/${region}/${type}/${engine}.json`;

exports.run = (entities, key, config, timeNrql, totalPeriodMs) => {
  // milliseconds to hours - divide the time value by 3.6e+6
  const { AWSRDSDBINSTANCE, defaultCloud, defaultRegions } = config;
  // milliseconds to hours - divide the time value by 3.6e+6
  const operatingHours = totalPeriodMs / 3.6e6;

  const conf = {
    cloud: defaultCloud || 'amazon',
    regions: {
      amazon: defaultRegions?.amazon || 'us-east-1'
    },
    optimize: {
      cpuRightSize: parseFloat(AWSRDSDBINSTANCE?.cpuRightSize || 0.5),
      memRightSize: parseFloat(AWSRDSDBINSTANCE?.memRightSize || 0.5),
      cpuMemUpperOperator: AWSRDSDBINSTANCE?.cpuMemUpperOperator || 'AND',
      cpuUpper: parseFloat(AWSRDSDBINSTANCE?.cpuUpper || 50),
      memUpper: parseFloat(AWSRDSDBINSTANCE?.memUpper || 50),
      cpuMemUpperStaleOperator:
        AWSRDSDBINSTANCE?.cpuMemUpperStaleOperator || 'AND',
      staleCpu: parseFloat(AWSRDSDBINSTANCE?.staleCpu || 3),
      staleMem: parseFloat(AWSRDSDBINSTANCE?.staleMem || 3),
      staleConnections: parseFloat(AWSRDSDBINSTANCE?.staleConnections || 3),
      staleStorageUsage: parseFloat(AWSRDSDBINSTANCE?.staleStorageUsage || 3)
    }
  };

  return new Promise(resolve => {
    const query = `query Query($guids: [EntityGuid]!) {
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
          DatastoreSample: nrdbQuery(nrql: "${DbQuery} ${timeNrql}") {
            results
          }
          MetricSample: nrdbQuery(nrql: "${metricDbQuery} ${timeNrql}") {
            results
          }
        }
      }
    }`;

    batchEntityQuery(key, query, entities, config).then(async entityData => {
      // get cloud pricing
      // const cloudPricing = await fetchPricing(
      //   `${BASE_URL}/amazon/sqs/pricing.json`
      // );
      // const priceData = cloudPricing?.priceData;

      // `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/rds/pricing/${region}/${type}/${engine}.json`

      const dbCombos = [];

      entityData.forEach(e => {
        // move samples top level
        const DatastoreSample = e?.DatastoreSample?.results?.[0] || {};
        const MetricSample = e?.MetricSample?.results?.[0] || {};

        console.log(JSON.stringify(DatastoreSample));
        console.log(JSON.stringify(MetricSample));

        // clean up keys
        Object.keys(DatastoreSample).forEach(key => {
          if (!DatastoreSample[key]) {
            delete DatastoreSample[key];
          } else if (key.startsWith('latest.')) {
            const newKey = key.replace('latest.', '');
            DatastoreSample[newKey] = DatastoreSample[key];
            delete DatastoreSample[key];
          }
        });
        e.DatastoreSample = DatastoreSample;

        const region = e.tags?.['aws.awsRegion']?.[0];
        const engine = e.tags?.['aws.engine']?.[0];
        const engineVersion = e.tags?.['aws.engineVersion']?.[0];
        const dbInstanceClass = e.tags?.['aws.dbInstanceClass']?.[0];

        let determinedEngine = '';

        if (engine.includes('aurora')) {
          if (engineVersion.includes('mysql')) {
            determinedEngine = 'mysql';
          }
          if (engineVersion.includes('mariadb')) {
            determinedEngine = 'mariadb';
          }
          if (engineVersion.includes('oracle')) {
            determinedEngine = 'oracle';
          }
          if (engineVersion.includes('postgres')) {
            determinedEngine = 'postgresql';
          }
          if (engineVersion.includes('sqlserver')) {
            determinedEngine = 'sqlserver';
          }
        } else {
          if (engine.includes('sqlserver')) determinedEngine = 'sqlserver';
          if (engine.includes('oracle')) determinedEngine = 'oracle';
          if (engine.includes('postgres')) determinedEngine = 'postgresql';
          if (engine.includes('mysql')) determinedEngine = 'mysql';
          if (engine.includes('mariadb')) determinedEngine = 'mariadb';
        }

        e.determinedEngine = determinedEngine;

        const foundCombo = dbCombos.find(
          d =>
            d.region === region &&
            d.determinedEngine === determinedEngine &&
            d.dbInstanceClass === dbInstanceClass
        );

        if (!foundCombo && e.determinedEngine) {
          dbCombos.push({
            region,
            determinedEngine,
            engine,
            engineVersion,
            dbInstanceClass
          });
        }
      });

      const pricingDataPromises = dbCombos.map(d =>
        fetchPricing(
          pricingUrl(d.region, d.dbInstanceClass, d.determinedEngine),
          null,
          d.region,
          d.determinedEngine,
          d.dbInstanceClass
        )
      );

      const pricingData = await Promise.all(pricingDataPromises);

      const entitiesToOptimize = [];

      entityData.forEach((e, entityIndex) => {
        const eRegion = e.tags?.['aws.awsRegion']?.[0];
        const eDbInstanceClass = e.tags?.['aws.dbInstanceClass']?.[0];
        const eMultiAz = e.tags?.['aws.multiAz']?.[0];

        pricingData.forEach(({ priceData, region, engine, type }) => {
          if (
            region === eRegion &&
            engine === e.determinedEngine &&
            type === eDbInstanceClass
          ) {
            const price = priceData.find(
              p =>
                (p.attributes.deploymentOption === 'Multi-AZ' && eMultiAz) ||
                (p.attributes.deploymentOption === 'Single-AZ' && !eMultiAz)
            );

            if (price) {
              e.price = {
                onDemandPrice: price.onDemandPrice,
                attributes: {
                  vcpu: price?.attributes?.vcpu,
                  memory: price?.attributes?.memory,
                  clockSpeed: price?.attributes?.clockSpeed
                }
              };
              // milliseconds to hours - divide the time value by 3.6e+6
              e.periodCost =
                operatingHours * (price?.onDemandPrice?.pricePerUnit?.USD || 0);
            }
          }
        });

        e.DatastoreSample.storageUsage =
          ((e.DatastoreSample['provider.allocatedStorageBytes'] -
            e.DatastoreSample['min.provider.freeStorageSpaceBytes.Minimum']) /
            e.DatastoreSample['provider.allocatedStorageBytes']) *
          100;

        const memoryBytes =
          (e?.price?.attributes?.memory || '').split(' ')?.[0] * 1.074e9;

        // calculate memory usage here as NR doesn't have the RDS instances available memory
        e.DatastoreSample.memoryUsage =
          ((memoryBytes -
            e.DatastoreSample['max.provider.freeableMemoryBytes.Maximum']) /
            memoryBytes) *
          100;

        // stale checks
        // undecided to implement stale checks on backend or not
        //   cpuMemUpperStaleOperator:
        //   AWSRDSDBINSTANCE?.cpuMemUpperStaleOperator || 'AND',
        // staleCpu: parseFloat(AWSRDSDBINSTANCE?.staleCpu || 5),
        // staleMem: parseFloat(AWSRDSDBINSTANCE?.staleMem || 5),
        // staleConnections: parseFloat(AWSRDSDBINSTANCE?.staleConnections || 5),
        // if (e.DatastoreSample.storageUsage <= conf.optimize.staleStorageUsage) {
        //   e.stale = true;
        // }
        // if (
        //   e.DatastoreSample['max.provider.databaseConnections.Maximum'] <=
        //   conf.optimize.staleConnections
        // ) {
        //   e.stale = true;
        // }

        const optimize = { cpu: false, memory: false };

        optimize.cpu =
          e.DatastoreSample['max.provider.cpuUtilization.Maximum'] <=
          conf.optimize.cpuUpper;

        optimize.memory =
          e.DatastoreSample.memoryUsage <= conf.optimize.memUpper;

        const performOptimization =
          (conf.optimize.cpuMemUpperOperator === 'AND' &&
            optimize.cpu &&
            optimize.memory) ||
          (conf.optimize.cpuMemUpperOperator === 'OR' &&
            (optimize.cpu || optimize.memory));

        if (performOptimization) {
          entitiesToOptimize.push(entityIndex);
        }
      });

      // this can be written more optimally to not re-query the same pricing
      const entityOptimizationPromises = entitiesToOptimize.map(entityIndex => {
        return new Promise(resolve => {
          const { tags, determinedEngine, price } = entityData[entityIndex];

          const region = tags?.['aws.awsRegion']?.[0];
          const eMultiAz = tags?.['aws.multiAz']?.[0];

          fetch(
            `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/rds/pricing/${region}/${determinedEngine}.json`
          )
            .then(response => {
              return response.json();
            })
            .then(priceData => {
              const filteredPrices = priceData
                .filter(p => {
                  const { vcpu, memory, deploymentOption } = p?.attributes;
                  const cpu = parseFloat(vcpu);
                  const mem = parseFloat(memory?.split(' ')?.[0] || 0);

                  if (eMultiAz && deploymentOption === 'Single-AZ') {
                    return false;
                  }

                  if (!eMultiAz && deploymentOption === 'Multi-AZ') {
                    return false;
                  }

                  const cpuRightSized =
                    price?.attributes?.vcpu * conf.optimize.cpuRightSize;
                  const memRightSized =
                    (price?.attributes?.memory.split(' ')?.[0] || 0) *
                    conf.optimize.memRightSize;

                  if (conf.optimize.cpuMemUpperOperator === 'AND') {
                    if (cpu <= cpuRightSized && mem <= memRightSized) {
                      return true;
                    }
                  } else if (conf.optimize.cpuMemUpperOperator === 'OR') {
                    if (cpu <= cpuRightSized || mem <= memRightSized) {
                      return true;
                    }
                  }

                  return false;
                })
                .sort(
                  (a, b) =>
                    parseFloat(b.onDemandPrice.pricePerUnit.USD) -
                    parseFloat(a.onDemandPrice.pricePerUnit.USD)
                );

              entityData[entityIndex].optimized =
                filteredPrices?.[0] || undefined;

              if (entityData[entityIndex].optimized) {
                entityData[entityIndex].optimizedPeriodCost =
                  operatingHours *
                  (entityData[entityIndex].optimized?.onDemandPrice
                    ?.pricePerUnit?.USD || 0);
              }

              resolve();
            });
        });
      });

      await Promise.all(entityOptimizationPromises);

      resolve(entityData);
    });
  });
};
