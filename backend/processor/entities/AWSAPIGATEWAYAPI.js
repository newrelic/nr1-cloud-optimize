const { batchEntityQuery, fetchPricing, BASE_URL } = require('./utils');

const GatewaySampleQuery = `SELECT sum(provider.count.SampleCount) as 'requests' FROM ApiGatewaySample WHERE provider='ApiGatewayApi' LIMIT 1`;

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
          ApiGatewaySample: nrdbQuery(nrql: "${GatewaySampleQuery} ${timeNrql}") {
            results
          }
        }
      }
    }`;

    batchEntityQuery(key, query, entities, config).then(async entityData => {
      // get cloud pricing
      const cloudPricing = await fetchPricing(
        `${BASE_URL}/amazon/apigateway/pricing.json`
      );
      const priceData = cloudPricing?.priceData;

      if (priceData) {
        // massage entity data
        entityData.forEach(e => {
          // move samples top level
          const ApiGatewaySample = e?.ApiGatewaySample?.results?.[0] || {};

          // clean up keys
          Object.keys(ApiGatewaySample).forEach(key => {
            if (!ApiGatewaySample[key]) {
              delete ApiGatewaySample[key];
            } else if (key.startsWith('latest.')) {
              const newKey = key.replace('latest.', '');
              ApiGatewaySample[newKey] = ApiGatewaySample[key];
              delete ApiGatewaySample[key];
            }
          });
          e.ApiGatewaySample = ApiGatewaySample;

          const region = priceData?.mapping?.[e.tags?.['aws.awsRegion']?.[0]];
          const pricing = priceData?.regions?.[region.replace('Europe', 'EU')];

          if (pricing) {
            const requests = ApiGatewaySample.requests || 0;
            const apiCallPrice =
              pricing?.['API Calls Number of up to 333 million']?.price;

            if (apiCallPrice) {
              e.requestCost = apiCallPrice * requests;
              e.apiCallPrice = apiCallPrice;
            }
          }
        });
      }

      resolve(entityData);
    });
  });
};
