const { batchEntityQuery, fetchPricing, BASE_URL } = require('./utils');

const LambdaQuery = `SELECT average(provider.duration.Maximum), sum(provider.invocations.Sum), latest(provider.memorySize) FROM ServerlessSample LIMIT 1`;

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
          LambdaSample: nrdbQuery(nrql: "${LambdaQuery} ${timeNrql}") {
            results
          }
        }
      }
    }`;

    batchEntityQuery(key, query, entities, config).then(async entityData => {
      // get cloud pricing
      const cloudPricing = await fetchPricing(
        `${BASE_URL}/amazon/lambda/pricing.json`
      );
      const priceData = cloudPricing?.priceData;

      if (priceData) {
        // massage entity data
        entityData.forEach(e => {
          // move samples top level
          const LambdaSample = e?.LambdaSample?.results?.[0] || {};

          // clean up keys
          Object.keys(LambdaSample).forEach(key => {
            if (!LambdaSample[key]) {
              delete LambdaSample[key];
            } else if (key.startsWith('latest.')) {
              const newKey = key.replace('latest.', '');
              LambdaSample[newKey] = LambdaSample[key];
              delete LambdaSample[key];
            }
          });
          e.LambdaSample = LambdaSample;

          const region = priceData?.mapping?.[e.tags?.['aws.awsRegion']?.[0]];
          const pricing = priceData?.regions?.[region.replace('Europe', 'EU')];

          if (pricing) {
            const invocations = LambdaSample['sum.provider.invocations.Sum'];
            const averageDurationMs =
              LambdaSample['average.provider.duration.Maximum'];
            e.durationPrice = pricing?.['Lambda Duration'].price;
            e.requestPrice = pricing?.['Lambda Requests'].price;

            if (invocations && averageDurationMs) {
              e.durationCost = averageDurationMs * e.durationPrice;
              e.requestCost = invocations * e.requestPrice;
            }
          }
        });
      }

      resolve(entityData);
    });
  });
};
