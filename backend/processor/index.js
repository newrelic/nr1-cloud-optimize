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

const WORKLOAD_QUEUE_LIMIT = 5; // how many workloads to handle async
const ENTITY_TYPE_QUEUE_LIMIT = 3; // how many entity types to process async
const JOB_HISTORY_LIMIT = 10;
const STATUS_COLLECTION = 'jobStatus'; // account level
const RESULT_COLLECTION = 'optimizerResults'; // workload entity level
const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const DOCUMENT_RESULTS_MAX_LENGTH = 850;
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
  'INFRA::HOST::INFRASTRUCTURE_HOST_ENTITY': require('./entities/HOST')
};

module.exports.optimize = async (event, context, callback) => {
  const startedAt = new Date().getTime();
  const { body, key, jobId } = event;
  const logJob = logger.child({ jobId });

  const {
    nerdpackUUID,
    workloadGuids,
    config,
    accountId,
    collectionName,
    identifier,
    timeRange
  } = body;

  const timeNrql = timeRangeToNrql(timeRange);

  // perform a nerdstorage check to see if same UUIDs inflight
  const { jobStatusCollection, jobStatusMain } = await getJobStatus(
    nerdpackUUID,
    accountId,
    key
  );

  logJob.info({ jobStatusCollection, jobStatusMain });

  // write a pending job status event into nerdstorage
  await writeJobStatusEvent(
    startedAt,
    nerdpackUUID,
    accountId,
    key,
    jobId,
    workloadGuids,
    collectionName,
    identifier
  );

  // fetch all guids attached to each workload
  const workloadEntityData = await getWorkloadEntityData(workloadGuids, key);

  // logJob.info({ workloadEntityData });

  // process entities of each workload
  const workloadResults = await processWorkloads(
    workloadEntityData,
    key,
    config,
    timeNrql,
    timeRange
  );

  // logJob.info({ workloadResults });

  // write results result to workload entity storage
  const writeData = await workloadsResultsWriter(
    workloadResults,
    nerdpackUUID,
    key,
    jobId
  );

  logJob.info({ writeData });

  // update nerdstorage status doc
  await writeJobStatusEvent(
    startedAt,
    nerdpackUUID,
    accountId,
    key,
    jobId,
    workloadGuids,
    collectionName,
    identifier,
    'complete'
  );

  callback(null, null);
};

// write results for each workload
const workloadsResultsWriter = (workloadResults, uuid, key, jobId) => {
  return new Promise(resolve => {
    const writerPromises = workloadResults.map(w => writeResults(w, uuid, key));
    Promise.all(writerPromises).then(values => resolve(values));
  });
};

// write the results to a specific workloads nerdstorage
const writeResults = (workload, uuid, key, jobId) => {
  return new Promise(resolve => {
    const completedAt = new Date().getTime();
    const shards = { 1: [] };
    let currentShard = 1;
    for (let z = 0; z < workload.results.length; z++) {
      const tempArray = [...shards[currentShard], workload.results[z]];
      const expectedSize = new TextEncoder().encode(JSON.stringify(tempArray))
        .length;

      if (expectedSize >= DOCUMENT_RESULTS_MAX_LENGTH) {
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
      shardNo: no,
      completedAt,
      results: shards[no]
    }));

    const documentQueue = async.queue((document, callback) => {
      fetch('https://api.newrelic.com/graphql', {
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
  timeRange
) => {
  return new Promise(resolve => {
    const workloadData = [];
    const workloadQueue = async.queue((workload, callback) => {
      processWorkload(workload, key, config, timeNrql).then(value => {
        workloadData.push({
          // name: workload.name,
          guid: workload.guid,
          timeNrql,
          timeRange,
          processedAt: new Date().getTime(),
          // unpack the map into a flat array
          results: Object.keys(value || {})
            .map(key => value[key].map(e => e))
            .flat()
        });
        callback();
      });
    }, WORKLOAD_QUEUE_LIMIT);

    workloadQueue.push(workloadEntityData);

    workloadQueue.drain(() => {
      resolve(workloadData);
    });
  });
};

const processWorkload = (workload, key, config, timeNrql) => {
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
    const entityTypeQueue = async.queue((entityTypeGroup, callback) => {
      const { fullType, entities } = entityTypeGroup;
      const { run } = processorMap[fullType];

      if (run) {
        run(entities, key, config || {}, timeNrql).then(values => {
          entityTypeData[fullType] = values;
          callback();
        });
      } else {
        callback();
      }
    }, ENTITY_TYPE_QUEUE_LIMIT);

    entityTypeQueue.push(sortedGroupedEntities);

    entityTypeQueue.drain(() => {
      resolve(entityTypeData);
    });
  });
};

// fetch entities attached to each workload
const getWorkloadEntityData = (workloadGuids, key) => {
  return new Promise(resolve => {
    const workloadEntityData = [];
    const workloadEntityQueue = async.queue((guid, callback) => {
      workloadGuidFetch(guid, key).then(value => {
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
const workloadGuidFetch = (guid, key) => {
  return new Promise(resolve => {
    let name = '';
    let entities = [];
    const entityQueue = async.queue((task, callback) => {
      const { query } = task;
      // ng call
      fetch('https://api.newrelic.com/graphql', {
        method: 'post',
        body: JSON.stringify({
          query
        }),
        headers: { 'Content-Type': 'application/json', 'API-Key': key }
      }).then(async response => {
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
            entityQueue.push({ query: workloadEntityFetchQuery(guid, cursor) });
          }
          callback();
        } else {
          callback();
        }
      });
    }, WORKLOAD_QUEUE_LIMIT);

    entityQueue.push({ query: workloadEntityFetchQuery(guid) });

    entityQueue.drain(() => {
      resolve({ name, entities });
    });
  });
};

const getJobStatus = async (uuid, accountId, key) => {
  const response = await fetch('https://api.newrelic.com/graphql', {
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
  startedAt,
  uuid,
  accountId,
  key,
  jobId,
  workloadGuids,
  collectionName,
  identifier,
  status
) => {
  const document = {
    startedAt,
    workloadGuids,
    status: status || 'pending'
  };

  if (collectionName) document.collectionName = collectionName;
  if (identifier) document.identifier = identifier;
  if (status === 'complete') document.completedAt = new Date().getTime();

  const response = await fetch('https://api.newrelic.com/graphql', {
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
