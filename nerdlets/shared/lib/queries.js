const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const timeRangeToNrql = timeRange => {
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

// collect infra entities and apm entities
export const entitySearchQuery = cursor => `{
    actor {
      entitySearch(query: "(domain IN ('INFRA') AND type IN ('HOST', 'VSPHEREVM', 'VSPHEREHOST')) OR (type IN ('WORKLOAD')) OR (domain IN ('APM') AND type IN ('APPLICATION')) AND reporting = 'true'") {
        count
        results${cursor ? `(cursor: "${cursor}")` : ''} {
          nextCursor
          entities {
            account {
              id
              name
            }
            type
            guid
          }
        }
      }
    }
  }`;

// would be beneficial to get tags here
export const workloadQueries = `query ($accountId: Int!, $guid: EntityGuid!) {
  actor {
    account(id: $accountId) {
      workload {
        collection(guid: $guid) {
          entities {
            guid
          }
          permalink
          entitySearchQuery
          guid
          id
          name
          account {
            id
            name
          }
        }
      }
    }
  }
}
`;

// would be beneficial to get the guids and entity search query from here
export const getWorkloadTags = `query ($guids: [EntityGuid]!) {
  actor {
    entities(guids: $guids) {
      ... on WorkloadEntity {
        guid
        tags {
          key
          values
        }
      }
    }
  }
}`;

// multi entity type query
const infraSystemSampleQuery = `FROM SystemSample SELECT \
                                      latest(timestamp), latest(provider.instanceLifecycle), \
                                      latest(entityGuid), latest(apmApplicationNames), latest(providerAccountName), latest(hostname), latest(configName), \
                                      latest(awsRegion), latest(regionName), latest(zone), latest(regionId), latest(ec2InstanceId), latest(ec2InstanceType), latest(instanceType),\
                                      latest(coreCount), latest(processorCount), latest(memoryTotalBytes), latest(diskTotalBytes), latest(operatingSystem), \
                                      max(cpuPercent), max(memoryUsedBytes), max(memoryUsedBytes/memoryTotalBytes)*100 as 'max.memoryPercent' LIMIT 1`;

const infraNetworkSampleQuery = `FROM NetworkSample SELECT max(receiveBytesPerSecond), max(transmitBytesPerSecond) FACET interfaceName`;

// attributes are renamed to best match SystemSample to make computations simple
const vSphereVmQuery = `FROM VSphereVmSample SELECT \
                                    latest(timestamp), latest(entityGuid), latest(vmConfigName), latest(operatingSystem), latest(disk.totalMiB) * 1.049e+6 as 'latest.diskTotalBytes', \
                                    max(cpu.hostUsagePercent) as 'max.cpuPercent', max(mem.usage/mem.size) *100 as 'max.memoryPercent', \
                                    latest(cpu.cores) as 'latest.coreCount', latest(mem.size) * 1.049e+6 as 'latest.memoryTotalBytes' LIMIT 1`;

const vSphereHostQuery = `FROM VSphereHostSample SELECT latest(timestamp), latest(entityGuid), latest(disk.totalMiB) * 1.049e+6 as 'latest.diskTotalBytes', \
                                    max(cpu.percent) as 'max.cpuPercent', max(mem.usage/mem.size) *100 as 'max.memoryPercent', latest(cpu.cores) as 'latest.coreCount', \
                                    latest(mem.size) * 1.049e+6 as 'latest.memoryTotalBytes' LIMIT 1`;

const apmInfraDataQuery = `SELECT count(*) FROM Transaction,TransactionError,Span FACET host,containerId LIMIT MAX`;

// retrieve top 100 slow queries by max duration
const apmDatabaseSlowQuery = `SELECT max(duration), average(duration), latest(category), latest(name), latest(service.name), latest(db.collection), latest(db.statement) FROM Span \
                                WHERE category = 'datastore' OR nr.categories LIKE '%datastore%' AND db.statement IS NOT NULL FACET db.statement LIMIT 100`;

// core query
export const getEntityDataQuery = timeRange => `query ($guids: [EntityGuid]!) {
  actor {
    entities(guids: $guids) {
      type
      account {
        id
        name
      }
      tags {
        key
        values
      }
      permalink
      ... on GenericInfrastructureEntity {
        guid
        name
        vsphereVmSample: nrdbQuery(nrql: "${vSphereVmQuery} ${timeRangeToNrql(
  timeRange
)}", timeout: 30000) {
          results
        }
        vsphereHostSample: nrdbQuery(nrql: "${vSphereHostQuery} ${timeRangeToNrql(
  timeRange
)}", timeout: 30000) {
          results
        }
      }
      ... on ApmApplicationEntity {
        guid
        name
        apmInfraData: nrdbQuery(nrql: "${apmInfraDataQuery} ${timeRangeToNrql(
  timeRange
)}", timeout: 30000) {
          results
        }
        apmDatabaseSlowQueryData: nrdbQuery(nrql: "${apmDatabaseSlowQuery} ${timeRangeToNrql(
  timeRange
)}", timeout: 30000) {
          results
        }
      }
      ... on InfrastructureHostEntity {
        guid
        name
        systemSample: nrdbQuery(nrql: "${infraSystemSampleQuery} ${timeRangeToNrql(
  timeRange
)}", timeout: 30000) {
          results
        }
        networkSample: nrdbQuery(nrql: "${infraNetworkSampleQuery} ${timeRangeToNrql(
  timeRange
)}", timeout: 30000) {
          results
        }
      }
    }
  }
}`;
