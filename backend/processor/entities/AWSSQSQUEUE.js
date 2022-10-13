const { batchEntityQuery, fetchPricing, BASE_URL } = require('./utils');

const SqsQuery = `FROM QueueSample SELECT latest(awsRegion), latest(provider.numberOfMessagesSent.Sum + provider.numberOfMessagesReceived.Sum + provider.numberOfMessagesDeleted.Sum) as 'numberOfMessages' WHERE dataSourceName = 'SQS' LIMIT 1`;

exports.run = (
  entities,
  key,
  config,
  timeNrql,
  totalPeriodMs,
  nerdGraphUrl
) => {
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
          QueueSample: nrdbQuery(nrql: "${SqsQuery} ${timeNrql}", timeout: 120) {
            results
          }
        }
      }
    }`;

    batchEntityQuery(key, query, entities, config, nerdGraphUrl).then(
      async entityData => {
        // get cloud pricing
        const cloudPricing = await fetchPricing(
          `${BASE_URL}/amazon/sqs/pricing.json`
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

            const region = priceData?.mapping?.[e.tags?.['aws.awsRegion']?.[0]];
            const pricing =
              priceData?.regions?.[region.replace('Europe', 'EU')];

            if (pricing) {
              e.messageCostStandardPerReq = parseFloat(
                pricing?.['Standard per Requests']?.price || 0
              );
            }
          });
        }

        resolve(entityData);
      }
    );
  });
};
