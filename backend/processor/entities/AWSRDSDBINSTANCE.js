const { batchEntityQuery, fetchPricing } = require('./utils');

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

const pricingUrl = (region, type, engine) =>
  `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/rds/pricing/${region}/${type}/${engine}.json`;

exports.run = (entities, key, config, timeNrql) => {
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

      entityData.forEach(e => {
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
                  vcpu: price.attributes.vcpu,
                  memory: price.attributes.memory,
                  clockSpeed: price.attributes.clockSpeed
                }
              };
            }
          }
        });
      });

      resolve(entityData);
    });
  });
};
