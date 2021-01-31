/* eslint 
no-console: 0,
no-async-promise-executor: 0,
require-atomic-updates: 0,
no-unused-vars: 0,
react/no-did-update-set-state: 0
*/

import React, { Component } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { Icon } from 'semantic-ui-react';
import _ from 'lodash';
import { NerdGraphQuery } from 'nr1';
import queue from 'async/queue';
import { chunk, buildGroupByOptions } from '../../../../shared/lib/utils';

toast.configure();

const DataContext = React.createContext();

// ignore tags
const ignoreTags = [
  'guid',
  'hostname',
  'memorybytes',
  'instanceid',
  'instance_id',
  'private'
];

export const loadingMsg = msg => (
  <>
    <Icon name="spinner" loading />
    {msg}
  </>
);

export const successMsg = msg => (
  <>
    <Icon name="check" />
    {msg}
  </>
);

// current max supported
const entitySearchChunkValue = 25;

// how many elements to queue
const queueConcurrency = 5;

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

export const entitySearchQuery = (cursor, eSearchQuery) => `{
  actor {
    entitySearch(query: "type = 'AWSRDSDBINSTANCE' AND reporting = 'true' ${eSearchQuery ||
      ''}") {
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

const RdsQuery = `FROM DatastoreSample SELECT \
                    latest(timestamp), latest(entityGuid), latest(entityName), latest(displayName), latest(dataSourceName), latest(provider.clusterInstance), \
                    max(\`provider.readIops.Average\`), latest(provider.allocatedStorageBytes), latest(provider.freeStorageSpaceBytes.Average), \
                    max(\`provider.writeIops.Average\`), max(\`provider.databaseConnections.Average\`), max(\`provider.cpuUtilization.Average\`), \
                    max(\`provider.readLatency.Average\`), max(\`provider.writeLatency.Average\`), max(\`provider.networkReceiveThroughput.Average\`), \
                    max(\`provider.networkTransmitThroughput.Average\`), max(\`provider.swapUsage\`), max(\`provider.swapUsageBytes.Average\`), \
                    max(\`provider.freeableMemory.Average\`) LIMIT 1`;

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
        datastoreSample: nrdbQuery(nrql: "${RdsQuery} ${timeRangeToNrql(
  timeRange
)}", timeout: 30000) {
          results
        }
      }
    }
  }
}`;

export class RdsProvider extends Component {
  constructor(props) {
    super(props);

    this.state = {
      fetchingEntities: false,
      rawEntities: [],
      entities: [],
      timeRange: null,
      rulesCpu: 50,
      rulesStorageUsage: 50,
      rulesConnections: 5,
      rulesReadIops: 5000,
      rulesWriteIops: 5000,
      rulesFreeableMemoryMb: 2048
    };
  }

  async componentDidMount() {
    // fetch entities
    this.setState({ fetchingEntities: true }, () => {
      this.fetchEntities();
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const { timepickerEnabled, timeRange } = this.props;
    if (timepickerEnabled && prevProps.timeRange !== timeRange) {
      this.setState({ timeRange }, () => {
        console.log('post process with time');
        this.fetchEntities();
      });
    }
  }

  //
  updateDataState = stateData =>
    new Promise((resolve, reject) => {
      this.setState(stateData, () => {
        resolve(true);
      });
    });

  fetchEntities = async nextCursor => {
    const { userConfig } = this.state;
    const searchQuery =
      userConfig && userConfig.entitySearchQuery
        ? ` AND ${userConfig.entitySearchQuery}`
        : null;

    // intentionally do not query tags now, so that we can support incoming entities that only contain a guid and type
    const result = await NerdGraphQuery.query({
      query: entitySearchQuery(nextCursor, searchQuery)
    });

    const entitySearchResult =
      ((((result || {}).data || {}).actor || {}).entitySearch || {}).results ||
      {};

    if ((entitySearchResult.entities || []).length > 0) {
      let { rawEntities } = this.state;
      rawEntities = [...rawEntities, ...entitySearchResult.entities];
      this.setState({ rawEntities });
    }

    if (entitySearchResult.nextCursor) {
      this.fetchEntities(entitySearchResult.nextCursor, searchQuery);
    } else if (
      !entitySearchResult.nextCursor ||
      entitySearchResult.entities.length === 0
    ) {
      // completed
      const { rawEntities } = this.state;
      const { completeEntities, tags } = await this.getEntityData(rawEntities);
      const groupByOptions = buildGroupByOptions(completeEntities);

      this.setState(
        {
          fetchingEntities: false,
          entities: completeEntities,
          tags,
          groupByOptions
        },
        () => {
          this.props.storeState({
            tagsRds: tags,
            groupByOptionsRds: groupByOptions
          });
          console.log(this.state.entities);
          // this.postProcessEntities()
        }
      );
    }
  };

  // collect entity data
  getEntityData = async entities => {
    const { timeRange } = this.state;
    // chunk entity guids
    const guidChunks = chunk(
      entities.map(e => e.guid),
      entitySearchChunkValue
    );

    let completeEntities = [];
    let chunksCompleted = 0;

    const q = queue((task, cb) => {
      chunksCompleted++;

      NerdGraphQuery.query({
        query: getEntityDataQuery(timeRange),
        variables: { guids: task.chunk }
      }).then(v => {
        const entities = (((v || {}).data || {}).actor || {}).entities || [];
        if (entities.length > 0) {
          completeEntities = [...completeEntities, ...entities];
        }
        this.setState(
          { entityDataProgress: (chunksCompleted / guidChunks.length) * 100 },
          () => {
            cb();
          }
        );
      });
    }, queueConcurrency);

    guidChunks.forEach(chunk => q.push({ chunk }));

    await q.drain();

    // generate tags
    const tags = [];
    completeEntities.forEach(e => {
      e.tags.forEach(t => {
        // unpack tags for easy grouping
        e[`tag.${t.key}`] = t.values[0] || true;

        // make tags available for selection
        let ignoreTag = false;
        for (let z = 0; z < ignoreTags.length; z++) {
          if (t.key.toLowerCase().includes(ignoreTags[z])) {
            ignoreTag = true;
            break;
          }
        }

        if (!ignoreTag) {
          const tag = `${t.key}: ${t.values[0]}`;
          tags.push({ key: tag, value: tag, text: tag });
        }
      });
    });
    return { completeEntities, tags };
  };

  render() {
    const { children } = this.props;

    return (
      <DataContext.Provider
        value={{
          ...this.state,
          updateDataState: this.updateDataState
        }}
      >
        {/* <ToastContainer
          enableMultiContainer
          containerId="B"
          position={toast.POSITION.TOP_RIGHT}
        /> */}

        <ToastContainer containerId="C" position="bottom-right" />

        {children}
      </DataContext.Provider>
    );
  }
}

export const RdsConsumer = DataContext.Consumer;
