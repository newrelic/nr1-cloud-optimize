const { batchEntityQuery, fetchPricing, BASE_URL } = require('./utils');

const LoadBalancerQuery = `FROM LoadBalancerSample SELECT latest(awsRegion), latest(provider.ruleEvaluations.Sum), latest(provider.estimatedProcessedBytes.Maximum), latest(provider.estimatedAlbActiveConnectionCount.Maximum), latest(provider.estimatedAlbNewConnectionCount.Maximum) LIMIT 1`;

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
          LoadBalancerSample: nrdbQuery(nrql: "${LoadBalancerQuery} ${timeNrql}") {
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
          const pricing = priceData?.regions?.[region.replace('Europe', 'EU')];

          // https://aws.amazon.com/elasticloadbalancing/pricing/

          if (pricing) {
            const estimatedProcessedBytes =
              LoadBalancerSample['provider.estimatedProcessedBytes.Maximum'];

            e.processedGB = estimatedProcessedBytes / 1e9;

            e.pricePerGB = parseFloat(
              pricing['Classic Load Balancer Data'].price
            );

            e.pricePerHour = parseFloat(
              pricing['Classic Load Balancer Hours'].price
            );

            e.costPerHour = e.pricePerHour * operatingHours;
            e.costPerGB = e.processedGB * e.pricePerGB;
            e.periodCost = e.costPerGB + e.costPerHour;
          }
        });
      }

      resolve(entityData);
    });
  });
};
