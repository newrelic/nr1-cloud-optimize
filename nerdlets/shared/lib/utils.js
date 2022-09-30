/* 
eslint no-use-before-define: 0,
no-console: 0,
*/ // --> OFF

import {
  UserStorageQuery,
  UserStorageMutation,
  EntityStorageMutation,
  AccountStorageMutation,
  NerdGraphQuery,
  EntityStorageQuery,
  AccountStorageQuery,
  ngql
} from 'nr1';
import {
  categoryTypes,
  entityMetricModel,
  optimizationDefaults
} from '../../cloud-optimize-core/context/data';

export const validateRegion = (cloud, region, cloudRegions, userConfig) => {
  const regionExists = r => {
    for (let z = 0; z < cloudRegions[cloud].length; z++) {
      if (r === cloudRegions[cloud][z].id) {
        return cloudRegions[cloud][z].id;
      }
    }
    return false;
  };

  // region fallbacks
  // standard check
  const standardCheck = regionExists(region);
  if (standardCheck) return standardCheck;

  // zone to regions
  // sometimes regions with zones are returned which can be several characters longer from the region
  // attempt to match the primary region
  for (let z = 1; z < 5; z++) {
    const newRegion = regionExists(region.slice(0, z * -1));
    if (newRegion) {
      console.log(`setting ${cloud} region ${region} to ${newRegion}`);
      return newRegion;
    }
  }

  const defaultRegion =
    userConfig && userConfig[`${cloud}Region`]
      ? userConfig[`${cloud}Region`]
      : optimizationDefaults[`${cloud}Region`];

  console.log(
    `${cloud} ${region} does not exist, setting default ${defaultRegion}`
  );

  return defaultRegion;
};

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

export const tagFilterEntities = (entities, tags) => {
  if (tags.length === 0) return entities;

  return entities.filter(e => {
    for (let z = 0; z < tags.length; z++) {
      const tagSplit = tags[z].split(': ');
      if (e[`tag.${tagSplit[0]}`] === tagSplit[1]) {
        return true;
      }
    }
    return false;
  });
};

export const calculateGroupedMetrics = (entities, existingData, type) => {
  const entityMetricTotals =
    existingData || JSON.parse(JSON.stringify(entityMetricModel));

  entities.forEach(e => {
    // add instance costs
    if (categoryTypes[type].includes(e.type)) {
      Object.keys(entityMetricTotals[type]).forEach(k => {
        if (type === 'workloads' && k === 'entityCount') {
          entityMetricTotals[type][k] += e.entityData.length;
        } else if (e[k]) {
          entityMetricTotals[type][k] += e[k] || 0;
        }
      });
    }
  });

  return entityMetricTotals;
};

export const buildTags = (currentTags, newTags) => {
  newTags.forEach(tag => {
    currentTags.push(`${tag.key}:${tag.values[0]}`);
  });
  return [...new Set(currentTags)].sort();
};

export const buildGroupByOptions = entities => {
  const ignoreTags = ['aws.arn', 'guid', 'displayName'];
  const groupByOptions = [
    ...new Set(
      entities
        .map(e => e.tags)
        .flat()
        .map(t => t.key)
        .filter(t => !ignoreTags.includes(t))
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

export const adjustCost = (period, value) => {
  switch (period.value) {
    case 'D':
      value = value * 24;
      break;
    case 'M':
      value = value * 24 * 30;
      break;
    case 'Y':
      value = value * 24 * 30 * 12;
      break;
  }
  return parseFloat(value);
};

export const formatValue = (cost, decimals) => {
  if (decimals) {
    return cost.toFixed(decimals).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
  return cost.toString().replace(/\d(?=(\d{3})+\.)/g, '$&,');
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
  payload.accountId = parseFloat(accountId);
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

export const writeEntityDocument = async (
  guid,
  collection,
  documentId,
  payload
) => {
  const result = await EntityStorageMutation.mutate({
    entityGuid: guid,
    actionType: EntityStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
    collection,
    documentId,
    document: payload
  });
  return result;
};

export const deleteEntityDocument = async (guid, collection, documentId) => {
  const deletePayload = {
    entityGuid: guid,
    actionType: EntityStorageMutation.ACTION_TYPE.DELETE_COLLECTION,
    collection
  };
  if (documentId) {
    deletePayload.documentId = documentId;
    deletePayload.actionType =
      EntityStorageMutation.ACTION_TYPE.DELETE_DOCUMENT;
  }
  const result = await EntityStorageMutation.mutate(deletePayload);
  return result;
};

export const writeAccountDocument = async (
  accountId,
  collection,
  documentId,
  payload
) => {
  const result = await AccountStorageMutation.mutate({
    accountId,
    actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
    collection,
    documentId,
    document: payload
  });
  return result;
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

export const deleteAccountDocument = async (
  accountId,
  collection,
  documentId
) => {
  const result = await AccountStorageMutation.mutate({
    accountId,
    actionType: AccountStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
    collection,
    documentId
  });
  return result;
};

export const accountsQuery = ngql`
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
  return ngql`{
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
  const ngql = `{actor {accounts {name id reportingEventTypes(filter:["${eventType}"])}}}`;
  const result = await NerdGraphQuery.query({ query: ngql });
  if (result.error) {
    console.log(
      "Can't get reporting event types because NRDB is grumpy at NerdGraph.",
      result.error.graphQLErrors
    );
    console.log(JSON.stringify(result.error.graphQLErrors.slice(0, 5), 0, 2));
    return [];
  }
  return result.data.actor.accounts.filter(
    a => a.reportingEventTypes.length > 0
  );
};
