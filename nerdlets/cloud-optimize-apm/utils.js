import { NerdGraphQuery } from 'nr1';
import gql from 'graphql-tag';

export const nerdGraphQuery = async (query) => {
    let nerdGraphData = await NerdGraphQuery.query({query: gql`${query}`})
    return nerdGraphData.data
}

export const getEntityData = (entity) => {
    return `{
        actor {
          entity(guid: "${entity}") {
            ... on ApmApplicationEntity {
                name
                alertSeverity
                applicationId
                account {
                  id
                  name
                }
                apmSummary {
                    hostCount
                    errorRate
                    webThroughput
                    webResponseTimeAverage
                    throughput
                    responseTimeAverage
                    nonWebThroughput
                    nonWebResponseTimeAverage
                    instanceCount
                    apdexScore
                }
                nrdbQuery(nrql: "SELECT count(*) FROM Transaction,TransactionError,Span FACET host,containerId LIMIT 2000", timeout: 30000) {
                    results
                }
            }
          }
        }
      }`
}


export const getInstanceData = (accountId, hosts) => {
  return gql`{
    actor {
      account(id: ${accountId}) {
        system: nrql(query: "FROM SystemSample SELECT latest(timestamp) as 'timestamp', latest(apmApplicationNames) as 'apmApplicationNames', latest(providerAccountName) as 'providerAccountName', latest(entityGuid) as 'entityGuid', latest(awsRegion) as 'awsRegion', latest(regionName) as 'regionName', latest(zone) as 'zone', latest(coreCount) as 'numCpu', latest(memoryTotalBytes) as 'memTotalBytes', latest(operatingSystem) as 'operatingSystem', latest(ec2InstanceType) as 'ec2InstanceType', max(cpuPercent) as 'maxCpuPercent', max(memoryUsedBytes) as 'maxMemoryUsedBytes', max(memoryUsedBytes/memoryTotalBytes)*100 as 'maxMemoryPercent', latest(instanceType) as 'instanceType', latest(ec2InstanceId) as 'ec2InstanceId' FACET hostname WHERE coreCount is not null and ((instanceType is not null AND instanceType != 'unknown') OR ec2InstanceType is not null) AND hostname IN (${hosts}) LIMIT 2000 since 1 week ago", timeout: 30000) {
          results
        }
        network: nrql(query: "FROM NetworkSample SELECT latest(timestamp) as 'timestamp', latest(entityGuid) as 'entityGuid', max(receiveBytesPerSecond) as 'receiveBytesPerSecond', max(transmitBytesPerSecond) as 'transmitBytesPerSecond' FACET hostname WHERE ((instanceType is not null AND instanceType != 'unknown') OR ec2InstanceType is not null) AND hostname IN (${hosts}) LIMIT 2000 since 1 week ago", timeout: 30000) {
          results
        }
        uniqueHosts: nrql(query: "FROM SystemSample SELECT uniqueCount(hostname) WHERE coreCount is not null and ((instanceType is not null AND instanceType != 'unknown') OR ec2InstanceType is not null) AND hostname IN (${hosts}) SINCE 1 WEEK AGO TIMESERIES 1 day", timeout: 30000) {
          results
        }
      }
    }
  }`
}

export const getInfraHost = (accountId, hostname, containerId, appId) => {
  return gql`{
    actor {
      account(id: ${accountId}) {
        system: nrql(query: "FROM SystemSample SELECT hostname WHERE (hostname = '${hostname}' OR fullHostname = '${hostname}') LIMIT 1 since 1 week ago", timeout: 30000) {
          results
        }
        container: nrql(query: "FROM ProcessSample SELECT latest(hostname) as 'hostname' WHERE (containerId LIKE '${containerId || hostname}%' ${appId ? `OR apmApplicationIds LIKE '%${appId}%'` : ""}) FACET containerId since 1 week ago LIMIT 2000", timeout: 30000) {
          results
        }
      }
    }
  }`
}

export const getInfraAccount = (appId, appName) => {
  return gql`{
    actor {
      entitySearch(query: "domain IN ('INFRA') AND (\`tags.apmApplicationIds\` like '%${appId}%' OR \`tags.apmApplicationNames\` like '%${appName}%')") {
        query
        count
        results {
          entities {
            account {
              id
              name
            }
          }
        }
      }
    }
  }`
}

export const getContainerPerformance = (accountId, appId) => {
  return gql`{
    actor {
      account(id: ${accountId}) {
        container: nrql(query: "SELECT max(cpuPercent/numeric(coreCount)) as 'MaxCpuSysPerc', max(memoryResidentSizeBytes/numeric(systemMemoryBytes))*100 as 'MaxMemPerc', max(memoryResidentSizeBytes) as 'MaxMemResidentBytes' FROM ProcessSample WHERE apmApplicationIds LIKE '%${appId}%' SINCE 1 WEEK AGO", timeout: 30000) {
          results
        }
        uniqueContainers: nrql(query: "SELECT uniqueCount(containerId) FROM ProcessSample WHERE apmApplicationIds LIKE '%${appId}%' SINCE 1 WEEK AGO TIMESERIES 1 day", timeout: 30000) {
          results
        }
      }
    }
  }`
}