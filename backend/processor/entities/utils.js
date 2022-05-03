const async = require('async');
const logger = require('pino')();
// https://github.com/node-fetch/node-fetch#commonjs
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

const BATCH_QUEUE_LIMIT = 5;
const ENTITY_SEARCH_CHUNK_MAX = 25;
const retryConfig = {
  times: 7,
  interval: retryCount => 50 * Math.pow(2, retryCount)
};

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
  'accountId',
  'aws.availabilityZone',
  'aws.ec2InstanceType',
  'aws.awsRegion',
  'aws.cacheClusterId',
  'aws.dbInstanceClass',
  'aws.engine',
  'aws.engineVersion',
  'aws.multiAz',
  'aws.dbInstanceClass',
  'aws.dbInstanceIdentifier',
  'aws.storageType',
  'aws.storageEncrypted',
  'aws.clusterInstance',
  'aws.multiAz'
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
      })
        .then(async response => {
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
        })
        .catch(error => {
          logger.info({ message: 'failed @ batchEntityQuery', error });
          callback();
        });
    }, BATCH_QUEUE_LIMIT);

    entityQueue.push(guidChunks);

    entityQueue.drain(() => {
      resolve(entityData);
    });
  });
};

exports.nrqlQuery = (key, accountId, nrql, timeout) => {
  return new Promise(resolve => {
    async.retry(
      retryConfig,
      callback => {
        this.doNrqlQuery(key, accountId, nrql, timeout).then(nrqlResult => {
          const { nrqlData, error, errors } = nrqlResult;

          if (!error && !errors) {
            callback(null, nrqlData);
          } else if (error) {
            callback({ error }, nrqlData);
          } else if (errors) {
            callback({ errors }, nrqlData);
          } else {
            callback({ error: 'unknown error' }, nrqlData);
          }
        });
      },
      (err, result) => {
        if (err) {
          logger.info({
            accountId,
            nrql,
            error: err,
            message: 'nrqlQuery unsuccessful',
            result
          });
        }
        resolve(result);
      }
    );
  });
};

exports.doNrqlQuery = (key, accountId, nrql, timeout) => {
  return new Promise(resolve => {
    const query = `query NrqlQuery($accountId: Int!, $nrql: Nrql!) {
      actor {
        account(id: $accountId) {
          nrql(query: $nrql, timeout: ${timeout || 120}) {
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
    })
      .then(async response => {
        const httpData = await response.json();
        const nrqlData = httpData?.data?.actor?.account?.nrql;
        const errors = httpData?.errors || [];

        if (errors.length > 0) {
          resolve({ errors });
        } else {
          resolve({ nrqlData });
        }
      })
      .catch(error => {
        resolve({ error });
      });
  });
};

exports.fetchPricing = (url, cloud, region, engine, type) => {
  return new Promise(resolve => {
    fetch(url).then(async response => {
      try {
        const httpData = await response.json();
        resolve({ priceData: httpData, cloud, region, engine, type });
      } catch (e) {
        console.log('failed @ fetchPricing', e); // eslint-disable-line no-console
        resolve({});
      }
    });
  });
};

exports.roundHalf = num => {
  return num < 0.5 ? 0.5 : Math.round(num * 2) / 2;
};
