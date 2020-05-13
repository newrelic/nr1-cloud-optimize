import { UserStorageQuery, UserStorageMutation, NerdGraphQuery } from 'nr1';
import gql from 'graphql-tag';

export const getCollection = async (collection) => {
    let result = await UserStorageQuery.query({ collection: collection })
    let collectionResult = (result || {}).data || []
    return collectionResult
}

export const getDocument = async (collection, documentId) => {
  let result = await UserStorageQuery.query({ collection: collection, documentId: documentId })
  return result.data
}

export const writeDocument = async (collection, documentId, payload) => {
  let result = await UserStorageMutation.mutate({
                  actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
                  collection: collection,
                  documentId: documentId,
                  document: payload
                })
  return result
}

export const deleteDocument = async (collection, documentId) => {
  let result = await UserStorageMutation.mutate({
                  actionType: UserStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
                  collection: collection,
                  documentId: documentId
                })
  return result
}

export const accountsQuery = gql`{
  actor {
    accounts {
      id
      name
    }
  }
}`

export const isCloudLabel = (attributeName) => /label\..+/.test(attributeName);

export const cloudLabelAttributeToDisplayName = (attributeName) => attributeName.match(/label\.(.+)/)[1];

export const getSystemSampleKeySetNRQL = 'SELECT keyset() FROM SystemSample';

export const getInstanceData = (accountId, cloudLabelAttributes) => {
  let cloudLabelSelectString = ((cloudLabelAttributes.length > 0) ? ", " : "") + cloudLabelAttributes.map(att => `latest(\`${att}\`) as '${att}'`).join(', ');
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
  }`
}

// Taken from Lew's nr1-container-explorer https://github.com/newrelic/nr1-container-explorer/
export const accountsWithData = async (eventType) => {
  const gql = `{actor {accounts {name id reportingEventTypes(filter:["${eventType}"])}}}`
  let result = await NerdGraphQuery.query({query: gql}) 
  if(result.errors) {
    console.log("Can't get reporting event types because NRDB is grumpy at NerdGraph.", result.errors)
    console.log(JSON.stringify(result.errors.slice(0, 5), 0, 2))
    return []
  }
  return result.data.actor.accounts.filter(a => a.reportingEventTypes.length > 0)
}
