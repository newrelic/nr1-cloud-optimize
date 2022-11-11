const {
  batchEntityQuery,
  fetchPricing,
  nrqlQuery,
  BASE_URL
} = require('./utils');

const NodeQuery = `SELECT max(provider.cacheHits.Maximum), max(provider.cacheMisses.Maximum), max(provider.cpuUtilization.Maximum), max(provider.currConnections.Maximum), max(provider.newConnections.Maximum), max(provider.currItems.Maximum), max(provider.bytesUsedForCache.Maximum) FROM DatastoreSample WHERE provider='ElastiCacheRedisNode' LIMIT 1`;

const ClusterDataQuery = (clusterId, timeNrql) =>
  `SELECT latest(provider.cacheNodeType), latest(provider.cacheClusterId), latest(entityName) FROM DatastoreSample WHERE provider='ElastiCacheRedisCluster' AND provider.cacheClusterId = '${clusterId}' LIMIT 1  ${timeNrql}`;

exports.run = (
  entities,
  key,
  config,
  timeNrql,
  totalPeriodMs,
  nerdGraphUrl
) => {
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

    batchEntityQuery(key, query, entities, config, nerdGraphUrl).then(
      async entityData => {
        // get cloud pricing
        const cloudPricing = await fetchPricing(
          `${BASE_URL}/amazon/elasticache/pricing.json`
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
            e.cacheClusterId = e.tags?.['aws.cacheClusterId']?.[0];

            const accountId = e.tags?.accountId?.[0];
            const foundCluster = clusters.find(c => c.id === e.cacheClusterId);
            if (!foundCluster) {
              clusters.push({
                id: e.cacheClusterId,
                accountId: parseInt(accountId)
              });
            }
          });

          // get cluster data
          const clusterDataPromises = clusters.map(c =>
            nrqlQuery(
              key,
              c.accountId,
              ClusterDataQuery(c.id, timeNrql),
              null,
              nerdGraphUrl
            )
          );

          const clusterDataResponses = await Promise.all(clusterDataPromises);
          const clusterData = clusterDataResponses
            .map(c => c?.results?.[0])
            .filter(c => c);

          // use cluster data to determine node pricing
          entityData.forEach(e => {
            const cluster = clusterData.find(
              r => r['latest.provider.cacheClusterId'] === e.cacheClusterId
            );

            if (cluster) {
              const region = priceData?.mapping[e.tags?.['aws.awsRegion']?.[0]];
              const instanceType = cluster['latest.provider.cacheNodeType'];
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
      }
    );
  });
};
