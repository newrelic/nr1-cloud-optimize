const { batchEntityQuery, fetchPricing, BASE_URL } = require('./utils');

const SnsQuery = `SELECT sum(provider.numberOfMessagesPublished.Sum) as 'publishedMessages' FROM QueueSample WHERE provider='SnsTopic' LIMIT 1`;

exports.run = (entities, key, config, timeNrql) => {
  // const { AWSELASTICSEARCHNODE, defaultCloud, defaultRegions } = config;

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
          QueueSample: nrdbQuery(nrql: "${SnsQuery} ${timeNrql}") {
            results
          }
        }
      }
    }`;

    batchEntityQuery(key, query, entities, config).then(async entityData => {
      // get cloud pricing
      const cloudPricing = await fetchPricing(
        `${BASE_URL}/amazon/sns/pricing.json`
      );
      const priceData = cloudPricing?.priceData;

      if (priceData) {
        // massage entity data
        entityData.forEach(e => {
          // move samples top level
          const QueueSample = e?.QueueSample?.results?.[0] || {};

          // clean up keys
          Object.keys(QueueSample).forEach(key => {
            if (!QueueSample[key]) {
              delete QueueSample[key];
            } else if (key.startsWith('latest.')) {
              const newKey = key.replace('latest.', '');
              QueueSample[newKey] = QueueSample[key];
              delete QueueSample[key];
            }
          });
          e.QueueSample = QueueSample;

          // incomplete
        });
      }

      resolve(entityData);
    });
  });
};
