/* eslint no-unused-vars: 0 */ // --> OFF

// the root index serves as a queue handler with recursive support for nerdgraph
// to add new entity types look under the entities sub directory

const async = require('async');
const _ = require('lodash');
// https://github.com/node-fetch/node-fetch#commonjs
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
const logger = require('pino')();
const { workloadEntityFetchQuery } = require('./queries');
const { NERDGRAPH_URL } = require('./constants');

const WORKLOAD_QUEUE_LIMIT = 5; // how many workloads to handle async
const ENTITY_TYPE_QUEUE_LIMIT = 3; // how many entity types to process async
// const JOB_HISTORY_LIMIT = 10; // unused perhaps for future
const STATUS_COLLECTION = 'jobStatus'; // account level
const RESULT_COLLECTION = 'optimizerResults'; // workload entity level
const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
// Each document can have a maximum length of 1024 KiB when serialized. # https://developer.newrelic.com/explore-docs/nerdstorage/
const DOCUMENT_RESULTS_MAX_BYTES = 972800; // ~950 KiB
const DOCUMENT_WRITE_QUEUE_LIMIT = 5;

const timeRangeToNrql = timeRange => {
  if (!timeRange) {
    return 'SINCE 7 DAYS AGO';
  }

  if (timeRange.beginTime && timeRange.endTime) {
    return `SINCE ${timeRange.beginTime} UNTIL ${timeRange.endTime}`;
  } else if (timeRange.begin_time && timeRange.end_time) {
    return `SINCE ${timeRange.begin_time} UNTIL ${timeRange.end_time}`;
  } else if (timeRange.duration <= HOUR) {
    return `SINCE ${timeRange.duration / MINUTE} MINUTES AGO`;
  } else if (timeRange.duration <= DAY) {
    return `SINCE ${timeRange.duration / HOUR} HOURS AGO`;
  } else {
    return `SINCE ${timeRange.duration / DAY} DAYS AGO`;
  }
};

// map DOMAIN::TYPE:ENTITY_TYPE to a processor function
const processorMap = {
  'INFRA::HOST::INFRASTRUCTURE_HOST_ENTITY': require('./entities/HOST'),
  'INFRA::AWSAPIGATEWAYAPI::GENERIC_INFRASTRUCTURE_ENTITY': require('./entities/AWSAPIGATEWAYAPI'),
  'INFRA::AWSELASTICSEARCHNODE::GENERIC_INFRASTRUCTURE_ENTITY': require('./entities/AWSELASTICSEARCHNODE'),
  'INFRA::AWSELASTICACHEREDISNODE::GENERIC_INFRASTRUCTURE_ENTITY': require('./entities/AWSELASTICACHEREDISNODE'),
  'INFRA::AWSELB::GENERIC_INFRASTRUCTURE_ENTITY': require('./entities/AWSELB'),
  'INFRA::AWSALB::GENERIC_INFRASTRUCTURE_ENTITY': require('./entities/AWSALB'),
  'INFRA::AWSSQSQUEUE::GENERIC_INFRASTRUCTURE_ENTITY': require('./entities/AWSSQSQUEUE'),
  'INFRA::AWSLAMBDAFUNCTION::INFRASTRUCTURE_AWS_LAMBDA_FUNCTION_ENTITY': require('./entities/AWSLAMBDAFUNCTION'),
  'INFRA::AWSRDSDBINSTANCE::GENERIC_INFRASTRUCTURE_ENTITY': require('./entities/AWSRDSDBINSTANCE')
};

// INFRA::AWSDYNAMODBTABLE::GENERIC_INFRASTRUCTURE_ENTITY
// INFRA::AWSSNSTOPIC::GENERIC_INFRASTRUCTURE_ENTITY
// AWSSNSTOPIC: null,

module.exports.optimize = async (event, context, callback) => {
  const startedAt = new Date().getTime();
  const { body, key, jobId, headers } = event;
  const logJob = logger.child({ jobId });
  const nerdGraphUrl = NERDGRAPH_URL[headers?.['NR-REGION'] || 'US'];

  const {
    nerdpackUUID,
    workloadGuids,
    config,
    accountId,
    collectionId,
    identifier,
    timeRange
  } = body;

  const timeNrql = timeRangeToNrql(timeRange);

  let totalPeriodMs = 0;

  // default 7 days
  if (!timeRange) {
    totalPeriodMs = startedAt - new Date(startedAt - 86400000 * 7).getTime();
  } else if (timeRange.duration) {
    totalPeriodMs =
      startedAt - new Date(startedAt - timeRange.duration).getTime();
  } else if (timeRange.begin_time && timeRange.end_time) {
    const start = new Date(timeRange.begin_time);
    const end = new Date(timeRange.end_time);
    totalPeriodMs = start.getTime() - end.getTime();
  }

  // perform a nerdstorage check to see if same UUIDs inflight
  const { jobStatusCollection, jobStatusMain } = await getJobStatus(
    nerdpackUUID,
    accountId,
    key,
    nerdGraphUrl
  );

  logJob.info({ jobStatusCollection, jobStatusMain });

  // write a pending job status event into nerdstorage
  await writeJobStatusEvent(
    nerdGraphUrl,
    startedAt,
    nerdpackUUID,
    accountId,
    key,
    jobId,
    workloadGuids,
    collectionId,
    identifier,
    'pending',
    timeNrql,
    timeRange,
    totalPeriodMs
  );

  // fetch all guids attached to each workload
  const workloadEntityData = await getWorkloadEntityData(
    workloadGuids,
    key,
    nerdGraphUrl
  );

  // logJob.info({ workloadEntityData });

  // process entities of each workload
  const workloadResults = await processWorkloads(
    workloadEntityData,
    key,
    config,
    timeNrql,
    timeRange,
    totalPeriodMs
  );

  // logJob.info({ workloadResults });

  // write results result to workload entity storage
  const writeData = await workloadsResultsWriter(
    workloadResults,
    nerdpackUUID,
    key,
    jobId,
    nerdGraphUrl
  );

  logJob.info({ writeData });

  // update nerdstorage status doc
  await writeJobStatusEvent(
    nerdGraphUrl,
    startedAt,
    nerdpackUUID,
    accountId,
    key,
    jobId,
    workloadGuids,
    collectionId,
    identifier,
    'complete',
    timeNrql,
    timeRange,
    totalPeriodMs
  );

  callback(null, null);
};

// write results for each workload
const workloadsResultsWriter = (
  workloadResults,
  uuid,
  key,
  jobId,
  nerdGraphUrl
) => {
  return new Promise(resolve => {
    const writerPromises = workloadResults.map(w =>
      writeResults(w, uuid, key, jobId, nerdGraphUrl)
    );
    Promise.all(writerPromises).then(values => resolve(values));
  });
};

// write the results to a specific workloads nerdstorage
const writeResults = (workload, uuid, key, jobId, nerdGraphUrl) => {
  return new Promise(resolve => {
    const completedAt = new Date().getTime();
    const shards = { 1: [] };
    let currentShard = 1;
    for (let z = 0; z < workload.results.length; z++) {
      const tempArray = [...shards[currentShard], workload.results[z]];
      const expectedSize = new TextEncoder().encode(JSON.stringify(tempArray))
        .length;

      if (expectedSize >= DOCUMENT_RESULTS_MAX_BYTES) {
        currentShard++;
      }

      if (!shards[currentShard]) {
        shards[currentShard] = [];
      }

      shards[currentShard].push(workload.results[z]);
    }

    delete workload.results;
    workload.shardTotal = Object.keys(shards).length;
    if (!workload.timeRange) delete workload.timeRange;

    const documents = Object.keys(shards).map(no => ({
      ...workload,
      jobId,
      shardNo: parseInt(no),
      completedAt,
      results: shards[no]
    }));

    const documentQueue = async.queue((document, callback) => {
      fetch(nerdGraphUrl, {
        method: 'post',
        body: JSON.stringify({
          query:
            'mutation PlatformNerdStorageWriteDocumentMutation($collection: String!, $document: NerdStorageDocument!, $documentId: String!, $scopeByActor: Boolean = true, $scopeId: String!, $scopeName: NerdStorageScope!) { nerdStorageWriteDocument(collection: $collection, document: $document, documentId: $documentId, scope: {id: $scopeId, name: $scopeName}, scopeByActor: $scopeByActor) }',
          variables: {
            scopeByActor: false,
            actionType: 'write-document',
            collection: RESULT_COLLECTION,
            document,
            documentId: `${jobId}_${document.shardNo}`,
            scopeId: document.guid,
            scopeName: 'ENTITY'
          }
        }),
        headers: {
          'Content-Type': 'application/json',
          'API-Key': key,
          'newrelic-package-id': uuid
        }
      }).then(async response => {
        await response.json();
        callback();
      });
    }, DOCUMENT_WRITE_QUEUE_LIMIT);

    documentQueue.push(documents);

    documentQueue.drain(() => {
      resolve({
        guid: workload.guid,
        name: workload.name,
        completedAt,
        shardTotal: workload.shardTotal
      });
    });
  });
};

// process workloads
const processWorkloads = (
  workloadEntityData,
  key,
  config,
  timeNrql,
  timeRange,
  totalPeriodMs
) => {
  return new Promise(resolve => {
    const workloadData = [];
    const workloadQueue = async.queue((workload, callback) => {
      processWorkload(workload, key, config, timeNrql, totalPeriodMs).then(
        value => {
          const { entityTypeData, entityTypeCost } = value;
          workloadData.push({
            // name: workload.name,
            guid: workload.guid,
            timeNrql,
            timeRange,
            entityTypeCost,
            processedAt: new Date().getTime(),
            // unpack the map into a flat array
            results: Object.keys(entityTypeData || {})
              .map(key => entityTypeData[key].map(e => e))
              .flat()
          });
          callback();
        }
      );
    }, WORKLOAD_QUEUE_LIMIT);

    workloadQueue.push(workloadEntityData);

    workloadQueue.drain(() => {
      resolve(workloadData);
    });
  });
};

const processWorkload = (workload, key, config, timeNrql, totalPeriodMs) => {
  // sort entity types within
  return new Promise(resolve => {
    // group entities
    // normalize grouping with domain_type_entityType, call this as "fullType"
    const groupedEntities = _.groupBy(
      workload.entities,
      e => `${e.domain}::${e.type}::${e.entityType}`
    );
    const sortedGroupedEntities = Object.keys(
      groupedEntities
    ).map(fullType => ({ fullType, entities: groupedEntities[fullType] }));

    // control how many groups of entity types are queried simulataneously
    const entityTypeData = {};
    const entityTypeCost = {};

    const entityTypeQueue = async.queue((entityTypeGroup, callback) => {
      const { fullType, entities } = entityTypeGroup;
      const run = processorMap[fullType]?.run;

      // eslint-disable-next-line no-console
      console.log(fullType);

      if (run) {
        run(entities, key, config || {}, timeNrql, totalPeriodMs).then(
          values => {
            entityTypeData[fullType] = values;
            entityTypeCost[fullType] = buildCost(values);
            callback();
          }
        );
      } else {
        entityTypeData[fullType] = entities;
        callback();
      }
    }, ENTITY_TYPE_QUEUE_LIMIT);

    entityTypeQueue.push(sortedGroupedEntities);

    entityTypeQueue.drain(() => {
      resolve({ entityTypeData, entityTypeCost });
    });
  });
};

const buildCost = entities => {
  // totalKnown = confirmed cost
  // totalEstimated = estimated cost of a determined service/host
  // totalOptimized = if using an optimized service/host
  // potentialSaving = if optimized or stale detected what is that cost
  const cost = { known: 0, estimated: 0, optimized: 0, potentialSaving: 0 };

  entities.forEach(e => {
    // check if spot instance
    if (e.entityType === 'INFRASTRUCTURE_HOST_ENTITY') {
      if (e.spot) {
        const spotPrice = e?.matches?.exact?.[0]?.spotPrice?.[0]?.price;
        if (spotPrice) {
          cost.known = cost.known + spotPrice;
        }

        const optimizedSpotPrice =
          e?.matches?.optimized?.[0]?.spotPrice?.[0]?.price;
        if (optimizedSpotPrice) {
          cost.optimized = cost.optimized + optimizedSpotPrice;
          cost.potentialSaving = spotPrice - optimizedSpotPrice;
        }
      } else {
        const onDemandPrice = e?.matches?.exact?.[0]?.onDemandPrice;
        if (onDemandPrice) {
          cost.known = cost.known + onDemandPrice;
        }

        const estimatedPrice = e?.matches?.estimated?.[0]?.onDemandPrice;
        if (estimatedPrice) {
          cost.estimated = cost.estimated + estimatedPrice;
        }

        const optimizedOnDemandPrice =
          e?.matches?.optimized?.[0]?.onDemandPrice;
        if (optimizedOnDemandPrice) {
          cost.optimized = cost.optimized + optimizedOnDemandPrice;
          cost.potentialSaving = onDemandPrice - optimizedOnDemandPrice;
        }
      }
    } else {
      // some generic entity cost handling if available, not intended to be successful atm
      const onDemandPrice = e?.matches?.exact?.[0]?.onDemandPrice;
      if (onDemandPrice) {
        cost.known = cost.known + onDemandPrice;
      }

      const estimatedPrice = e?.matches?.estimated?.[0]?.onDemandPrice;
      if (estimatedPrice) {
        cost.estimated = cost.estimated + estimatedPrice;
      }

      const optimizedOnDemandPrice = e?.matches?.optimized?.[0]?.onDemandPrice;
      if (optimizedOnDemandPrice) {
        cost.optimized = cost.optimized + optimizedOnDemandPrice;
        cost.potentialSaving = onDemandPrice - optimizedOnDemandPrice;
      }
    }
  });
};

// fetch entities attached to each workload
const getWorkloadEntityData = (workloadGuids, key, nerdGraphUrl) => {
  return new Promise(resolve => {
    const workloadEntityData = [];
    const workloadEntityQueue = async.queue((guid, callback) => {
      workloadGuidFetch(guid, key, nerdGraphUrl).then(value => {
        const { name, entities } = value;
        const data = { guid, name, entities };
        workloadEntityData.push(data);
        callback();
      });
    }, WORKLOAD_QUEUE_LIMIT);

    workloadEntityQueue.push(workloadGuids);

    workloadEntityQueue.drain(() => {
      resolve(workloadEntityData);
    });
  });
};

// fetch entities attached to specific workload
const workloadGuidFetch = (guid, key, nerdGraphUrl) => {
  return new Promise(resolve => {
    let name = '';
    let entities = [];
    const entityQueue = async.queue((task, callback) => {
      const { query } = task;
      // ng call
      fetch(nerdGraphUrl, {
        method: 'post',
        body: JSON.stringify({
          query
        }),
        headers: { 'Content-Type': 'application/json', 'API-Key': key }
      })
        .then(async response => {
          const httpData = await response.json();
          name = httpData?.data?.actor?.entity?.name;

          const relatedEntities =
            httpData?.data?.actor?.entity?.relatedEntities || null;

          if (relatedEntities) {
            const returnedEntities = (relatedEntities?.results || []).map(
              r => r.target.entity
            );
            const cursor = relatedEntities?.nextCursor;
            entities = [...entities, ...returnedEntities];

            if (cursor) {
              entityQueue.push({
                query: workloadEntityFetchQuery(guid, cursor)
              });
            }
            callback();
          } else {
            callback();
          }
        })
        .catch(e => {
          console.log('failed @ workloadGuidFetch', e); // eslint-disable-line no-console
          callback();
        });
    }, WORKLOAD_QUEUE_LIMIT);

    entityQueue.push({ query: workloadEntityFetchQuery(guid) });

    entityQueue.drain(() => {
      resolve({ name, entities });
    });
  });
};

const getJobStatus = async (uuid, accountId, key, nerdGraphUrl) => {
  const response = await fetch(nerdGraphUrl, {
    method: 'post',
    body: JSON.stringify({
      operationName: 'AccountCollectionStorage',
      query: `query AccountCollectionStorage($accountId: Int!, $collectionName: String!) {
        actor {
          account(id: $accountId) {
            nerdStorage {
              document(collection: $collectionName, documentId: "main")
              collection(collection: $collectionName) {
                document
                id
              }
            }
          }
        }
      }`,
      variables: { accountId, collectionName: STATUS_COLLECTION }
    }),
    headers: {
      'Content-Type': 'application/json',
      'API-Key': key,
      'newrelic-package-id': uuid
    }
  });

  const httpData = await response.json();
  const nerdStoreData = httpData?.data?.actor?.account?.nerdStorage;

  return {
    jobStatusCollection: nerdStoreData.collection,
    jobStatusMain: nerdStoreData.document
  };
};

const writeJobStatusEvent = async (
  nerdGraphUrl,
  startedAt,
  uuid,
  accountId,
  key,
  jobId,
  workloadGuids,
  collectionId,
  identifier,
  status,
  timeNrql,
  timeRange,
  totalPeriodMs
) => {
  const document = {
    startedAt,
    workloadGuids,
    status: status || 'pending',
    timeNrql,
    timeRange,
    totalPeriodMs
  };

  if (collectionId) document.collectionId = collectionId;
  if (identifier) document.identifier = identifier;
  if (status === 'complete') document.completedAt = new Date().getTime();

  const response = await fetch(nerdGraphUrl, {
    method: 'post',
    body: JSON.stringify({
      query: `mutation PlatformNerdStorageWriteDocumentMutation($collection: String!, $document: NerdStorageDocument!, $documentId: String!, $scopeByActor: Boolean = true, $scopeId: String!, $scopeName: NerdStorageScope!) { nerdStorageWriteDocument(collection: $collection, document: $document, documentId: $documentId, scope: {id: $scopeId, name: $scopeName}, scopeByActor: $scopeByActor) }`,
      variables: {
        scopeByActor: true,
        actionType: 'write-document',
        collection: STATUS_COLLECTION,
        document,
        documentId: jobId,
        scopeId: `${accountId}`,
        scopeName: 'ACCOUNT'
      }
    }),
    headers: {
      'Content-Type': 'application/json',
      'API-Key': key,
      'newrelic-package-id': uuid
    }
  });

  await response.json();

  // output returned document
  // const httpData = await response.json();
  // const nerdStoreWriteData = httpData?.data?.nerdStorageWriteDocument;
  // console.log(nerdStoreWriteData);
};
