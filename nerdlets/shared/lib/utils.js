import {
  UserStorageQuery,
  UserStorageMutation,
  NerdGraphQuery,
  EntityStorageQuery,
  AccountStorageQuery
} from 'nr1';
import gql from 'graphql-tag';
import {
  categoryTypes,
  entityCostModel
} from '../../cloud-optimize-core/context/data';

export const getTagValue = (tags, tag) => {
  if (tags) {
    for (let z = 0; z < tags.length; z++) {
      if (tags[z].key === tag) {
        if (tags[z].values.length === 1) {
          return tags[z].values[0];
        } else {
          return tags[z].values;
        }
      }
    }
  }
  return null;
};

export const calculateGroupedCosts = entities => {
  const entityCostTotals = JSON.parse(JSON.stringify(entityCostModel));

  entities.forEach(e => {
    // add instance costs
    if (categoryTypes.instance.includes(e.type)) {
      Object.keys(entityCostTotals.instances).forEach(k => {
        if (e[k]) {
          entityCostTotals.instances[k] += e[k] || 0;
        }
      });
    }
  });

  return entityCostTotals;
};

export const buildTags = (currentTags, newTags) => {
  newTags.forEach(tag => {
    currentTags.push(`${tag.key}:${tag.values[0]}`);
  });
  return [...new Set(currentTags)].sort();
};

export const buildGroupByOptions = entities => {
  const groupByOptions = [
    ...new Set(
      entities
        .map(e => e.tags)
        .flat()
        .map(t => t.key)
    )
  ]
    .sort()
    .map(t => ({
      value: t,
      label: t
    }));

  return groupByOptions;
};

export const existsInObjArray = (array, key, value) => {
  for (let z = 0; z < (array || []).length; z++) {
    if (array[z][key] === value) {
      return z;
    }
  }
  return false;
};

export const roundHalf = num => {
  return num < 0.5 ? 0.5 : Math.round(num * 2) / 2;
};

// chunking for batching nerdgraph calls
export const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

export const getEntityCollection = async (collection, guid, documentId) => {
  const payload = { collection };
  payload.entityGuid = guid;
  if (documentId) payload.documentId = documentId;
  const result = await EntityStorageQuery.query(payload);
  const collectionResult = (result || {}).data || (documentId ? null : []);
  return collectionResult;
};

export const getAccountCollection = async (
  accountId,
  collection,
  documentId
) => {
  const payload = { collection };
  payload.accountId = accountId;
  if (documentId) payload.documentId = documentId;
  const result = await AccountStorageQuery.query(payload);
  const collectionResult = (result || {}).data || (documentId ? null : []);
  return collectionResult;
};

export const getCollection = async (collection, documentId) => {
  const payload = { collection };
  if (documentId) payload.documentId = documentId;
  const result = await UserStorageQuery.query(payload);
  const collectionResult = (result || {}).data || (documentId ? null : []);
  return collectionResult;
};

export const getDocument = async (collection, documentId) => {
  const result = await UserStorageQuery.query({
    collection: collection,
    documentId: documentId
  });
  return result.data;
};

export const writeDocument = async (collection, documentId, payload) => {
  const result = await UserStorageMutation.mutate({
    actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
    collection: collection,
    documentId: documentId,
    document: payload
  });
  return result;
};

export const deleteDocument = async (collection, documentId) => {
  const result = await UserStorageMutation.mutate({
    actionType: UserStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
    collection: collection,
    documentId: documentId
  });
  return result;
};

export const accountsQuery = gql`
  {
    actor {
      accounts {
        id
        name
      }
    }
  }
`;

export const isCloudLabel = attributeName => /label\..+/.test(attributeName);

export const cloudLabelAttributeToDisplayName = attributeName =>
  attributeName.match(/label\.(.+)/)[1];

export const getSystemSampleKeySetNRQL = 'SELECT keyset() FROM SystemSample';

export const getInstanceData = (accountId, cloudLabelAttributes) => {
  const cloudLabelSelectString =
    (cloudLabelAttributes.length > 0 ? ', ' : '') +
    cloudLabelAttributes
      .map(att => `latest(\`${att}\`) as '${att}'`)
      .join(', ');
  return gql`{
    actor {
      account(id: ${accountId}) {
        system: nrql(query: "FROM SystemSample SELECT latest(entityName) as 'entityName', latest(timestamp) as 'timestamp', latest(apmApplicationNames) as 'apmApplicationNames', latest(providerAccountName) as 'providerAccountName', latest(entityGuid) as 'entityGuid', latest(awsRegion) as 'awsRegion', latest(regionName) as 'regionName', latest(zone) as 'zone', latest(coreCount) as 'numCpu', latest(memoryTotalBytes) as 'memTotalBytes', latest(operatingSystem) as 'operatingSystem', latest(ec2InstanceType) as 'ec2InstanceType', max(cpuPercent) as 'maxCpuPercent', max(memoryUsedBytes/memoryTotalBytes)*100 as 'maxMemoryPercent', latest(instanceType) as 'instanceType', latest(ec2InstanceId) as 'ec2InstanceId'${cloudLabelSelectString} FACET hostname WHERE coreCount is not null and ((instanceType is not null AND instanceType != 'unknown') OR ec2InstanceType is not null) LIMIT 2000 since 1 week ago", timeout: 30000) {
          results
        }
        network: nrql(query: "FROM NetworkSample SELECT latest(timestamp) as 'timestamp', latest(entityGuid) as 'entityGuid', max(receiveBytesPerSecond) as 'receiveBytesPerSecond', max(transmitBytesPerSecond) as 'transmitBytesPerSecond' FACET hostname WHERE ((instanceType is not null AND instanceType != 'unknown') OR ec2InstanceType is not null) LIMIT 2000 since 1 week ago", timeout: 30000) {
          results
        }
      }
    }
  }`;
};

// Taken from Lew's nr1-container-explorer https://github.com/newrelic/nr1-container-explorer/
export const accountsWithData = async eventType => {
  const gql = `{actor {accounts {name id reportingEventTypes(filter:["${eventType}"])}}}`;
  const result = await NerdGraphQuery.query({ query: gql });
  if (result.errors) {
    /* eslint-disable no-console */
    console.log(
      "Can't get reporting event types because NRDB is grumpy at NerdGraph.",
      result.errors
    );
    console.log(JSON.stringify(result.errors.slice(0, 5), 0, 2));
    /* eslint-enable */
    return [];
  }
  return result.data.actor.accounts.filter(
    a => a.reportingEventTypes.length > 0
  );
};
