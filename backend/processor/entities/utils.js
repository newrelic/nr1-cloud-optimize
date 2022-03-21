const async = require('async');
// https://github.com/node-fetch/node-fetch#commonjs
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

const BATCH_QUEUE_LIMIT = 5;
const ENTITY_SEARCH_CHUNK_MAX = 25;

// ignore tags
const defaultIgnoreTags = [
  'guid',
  'hostname',
  'memorybytes',
  'instanceid',
  'instance_id',
  'private',
  'host'
];

const defaultAllowedTags = [
  'instanceType',
  'type',
  'aws.ec2InstanceType',
  'aws.awsRegion',
  'aws.cacheClusterId',
  'aws.dbInstanceClass',
  'aws.engine',
  'aws.multiAz',
  'accountId'
];

exports.BASE_URL = 'https://nr1-cloud-optimize.s3.ap-southeast-2.amazonaws.com';

exports.batchEntityQuery = (key, query, entities, config) => {
  return new Promise(resolve => {
    // chunk entity guids
    const guidChunks = chunk(
      entities.map(e => e.guid),
      ENTITY_SEARCH_CHUNK_MAX
    );

    const allowedTags = [...defaultAllowedTags, ...(config?.allowedTags || [])];
    const ignoreTags = [...defaultIgnoreTags, ...(config?.ignoreTags || [])];

    let entityData = [];
    const entityQueue = async.queue((guids, callback) => {
      fetch('https://api.newrelic.com/graphql', {
        method: 'post',
        body: JSON.stringify({
          query,
          variables: { guids }
        }),
        headers: {
          'Content-Type': 'application/json',
          'API-Key': key
        }
      }).then(async response => {
        const httpData = await response.json();
        const entities = (httpData?.data?.actor?.entities || []).map(e => {
          // perform some tag sanitization
          const tags = {};
          e.tags
            .filter(
              t =>
                !ignoreTags.includes(t.key) &&
                !ignoreTags.includes(t.key.toLowerCase()) &&
                (t.key.startsWith('label.') || allowedTags.includes(t.key))
            )
            .forEach(t => {
              tags[t.key] = t.values;
            });

          const entity = { ...e, tags };

          return entity;
        });

        entityData = [...entityData, ...entities];

        callback();
      });
    }, BATCH_QUEUE_LIMIT);

    entityQueue.push(guidChunks);

    entityQueue.drain(() => {
      resolve(entityData);
    });
  });
};

exports.nrqlQuery = (key, accountId, nrql) => {
  return new Promise(resolve => {
    const query = `query NrqlQuery($accountId: Int!, $nrql: Nrql!) {
      actor {
        account(id: $accountId) {
          nrql(query: $nrql) {
            results
          }
        }
      }
    }`;

    fetch('https://api.newrelic.com/graphql', {
      method: 'post',
      body: JSON.stringify({
        query,
        variables: { accountId, nrql }
      }),
      headers: {
        'Content-Type': 'application/json',
        'API-Key': key
      }
    }).then(async response => {
      const httpData = await response.json();
      const nrqlData = httpData?.data?.actor?.account?.nrql;
      resolve(nrqlData);
    });
  });
};

exports.fetchPricing = (url, cloud, region) => {
  return new Promise(resolve => {
    fetch(url).then(async response => {
      const httpData = await response.json();
      resolve({ priceData: httpData, cloud, region });
    });
  });
};

exports.roundHalf = num => {
  return num < 0.5 ? 0.5 : Math.round(num * 2) / 2;
};
