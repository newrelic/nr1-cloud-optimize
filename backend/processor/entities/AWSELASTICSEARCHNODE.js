const {
  batchEntityQuery,
  fetchPricing,
  nrqlQuery,
  BASE_URL
} = require('./utils');

const NodeQuery = `FROM DatastoreSample SELECT latest(provider.domainName), max(provider.CPUUtilization.Maximum), max(provider.ReadIOPS.Maximum), max(provider.WriteIOPS.Maximum), max(provider.ReadThroughput.Maximum), max(provider.WriteThroughput.Maximum), max(provider.SearchRate.Maximum) WHERE provider='ElasticsearchNode' LIMIT 1`;

const ClusterDataQuery = (clusterName, timeNrql) =>
  `FROM DatastoreSample SELECT latest(awsRegion), latest(provider.instanceType), latest(entityName) WHERE provider='ElasticsearchCluster' WHERE entityName = '${clusterName}' OR provider.domainName = '${clusterName}' LIMIT 1 ${timeNrql}`;

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
          NodeSample: nrdbQuery(nrql: "${NodeQuery} ${timeNrql}", timeout: 120) {
            results
          }
        }
      }
    }`;

    batchEntityQuery(key, query, entities, config).then(async entityData => {
      // get cloud pricing
      const cloudPricing = await fetchPricing(
        `${BASE_URL}/amazon/elasticsearch/pricing.json`
      );
      const priceData = cloudPricing?.priceData;

      if (priceData) {
        // cluster data promises
        const clusters = [];

        // massage entity data
        entityData.forEach(e => {
          // move samples top level
          const NodeSample = e?.NodeSample?.results?.[0] || {};

          // clean up keys
          Object.keys(NodeSample).forEach(key => {
            if (!NodeSample[key]) {
              delete NodeSample[key];
            } else if (key.startsWith('latest.')) {
              const newKey = key.replace('latest.', '');
              NodeSample[newKey] = NodeSample[key];
              delete NodeSample[key];
            }
          });
          e.NodeSample = NodeSample;
          const awsDomainName = e.tags?.['aws.domainName']?.[0];
          const accountId = e.tags?.accountId?.[0];
          e.clusterName = NodeSample?.['provider.domainName'] || awsDomainName;

          const foundCluster = clusters.find(c => c.name === e.clusterName);
          if (!foundCluster) {
            clusters.push({
              name: e.clusterName,
              accountId: parseInt(accountId)
            });
          }
        });

        // get cluster data
        const clusterDataPromises = clusters.map(c =>
          nrqlQuery(key, c.accountId, ClusterDataQuery(c.name, timeNrql))
        );
        const clusterDataResponses = await Promise.all(clusterDataPromises);
        const clusterData = clusterDataResponses
          .map(c => c?.results?.[0])
          .filter(c => c);

        // use cluster data to determine node pricing
        entityData.forEach(e => {
          const cluster = clusterData.find(
            r => r['latest.entityName'] === e.clusterName
          );

          if (cluster) {
            const region = priceData?.mapping[cluster['latest.awsRegion']];
            const instanceType = cluster[
              'latest.provider.instanceType'
            ].replace('elasticsearch', 'search');

            const pricing = priceData.regions[region.replace('Europe', 'EU')];

            if (pricing) {
              const discoveredPrices = [];

              Object.keys(pricing).forEach(key => {
                const data = pricing[key];
                const priceInstanceType = data?.['Instance Type'];
                if (priceInstanceType === instanceType) {
                  discoveredPrices.push(data);
                }
              });

              if (discoveredPrices.length > 0) {
                e.discoveredPrices = discoveredPrices;
                e.periodCost = discoveredPrices?.[0]?.price * operatingHours;
              }
            }
          }
        });
      }

      resolve(entityData);
    });
  });
};
