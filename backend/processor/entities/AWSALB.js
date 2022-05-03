const { batchEntityQuery, fetchPricing, BASE_URL } = require('./utils');

const LoadBalancerQuery = `FROM LoadBalancerSample SELECT latest(awsRegion), latest(provider.ruleEvaluations.Sum), latest(provider.processedBytes.Maximum), latest(provider.newConnectionCount.Sum), latest(procider.activeConnectionCount.Sum) LIMIT 1`;

exports.run = (entities, key, config, timeNrql, totalPeriodMs) => {
  // milliseconds to hours - divide the time value by 3.6e+6
  const operatingHours = totalPeriodMs / 3.6e6;

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
          LoadBalancerSample: nrdbQuery(nrql: "${LoadBalancerQuery} ${timeNrql}", timeout: 120) {
            results
          }
        }
      }
    }`;

    batchEntityQuery(key, query, entities, config).then(async entityData => {
      // get cloud pricing
      const cloudPricing = await fetchPricing(
        `${BASE_URL}/amazon/elb/pricing.json`
      );
      const priceData = cloudPricing?.priceData;

      if (priceData) {
        entityData.forEach(e => {
          // move samples top level
          const LoadBalancerSample = e?.LoadBalancerSample?.results?.[0] || {};

          // clean up keys
          Object.keys(LoadBalancerSample).forEach(key => {
            if (!LoadBalancerSample[key]) {
              delete LoadBalancerSample[key];
            } else if (key.startsWith('latest.')) {
              const newKey = key.replace('latest.', '');
              LoadBalancerSample[newKey] = LoadBalancerSample[key];
              delete LoadBalancerSample[key];
            }
          });
          e.LoadBalancerSample = LoadBalancerSample;

          const region = priceData?.mapping?.[e.tags?.['aws.awsRegion']?.[0]];
          const pricing = priceData?.regions?.[region];

          // https://aws.amazon.com/elasticloadbalancing/pricing/

          if (pricing) {
            // LCU Cost
            // You are charged only on the dimension with the highest usage. An LCU contains:
            // 25 new connections per second.
            // 3,000 active connections per minute.
            // 1 GB per hour for EC2 instances, containers and IP addresses as targets and 0.4 GB per hour for Lambda functions as targets

            // work on 1 connection per second
            const newConnLCUs = LoadBalancerSample[
              'provider.newConnectionCount.Sum'
            ]
              ? 1 / LoadBalancerSample['provider.newConnectionCount.Sum']
              : 0;

            // work on 1 new connection per second, each lasting 2 minutes
            const activeConnLCUs = LoadBalancerSample[
              'provider.activeConnectionCount.Sum'
            ]
              ? 120 / LoadBalancerSample['provider.activeConnectionCount.Sum']
              : 0;

            const processedGbLCUs = LoadBalancerSample[
              'provider.processedBytes.Sum'
            ]
              ? LoadBalancerSample['provider.processedBytes.Sum'] / 1e9 / 1
              : 0;

            // Rule Evaluations (per second): For simplicity, assume that all configured rules are processed for a request.
            // Each LCU provides 1,000 rule evaluations per second (averaged over the hour).
            // Since your application receives 5 requests/sec, 60 processed rules for each request results
            // in a maximum 250 rule evaluations per second (60 processed rules – 10 free rules) * 5 or 0.25 LCU (250 rule evaluations per second / 1,000 rule evaluations per second)
            const rulesSum = LoadBalancerSample['provider.ruleEvaluations.Sum'];
            const rulesEvalLCUs = rulesSum > 10 ? (rulesSum - 10) * 5 : 0;

            e.lcuPricePerHour = parseFloat(
              pricing['Application Load Balancer LCU Hours'].price
            );

            e.lcuCostPerHour =
              e.lcuPricePerHour *
              (newConnLCUs + activeConnLCUs + processedGbLCUs + rulesEvalLCUs);
            e.pricePerHour = parseFloat(
              pricing['Application Load Balancer Hours'].price
            );

            e.periodCost =
              operatingHours * e.pricePerHour +
              operatingHours * e.lcuCostPerHour;
          }
        });
      }

      resolve(entityData);
    });
  });
};
