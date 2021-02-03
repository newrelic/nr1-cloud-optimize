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
import {
  chunk,
  buildGroupByOptions,
  getCollection
} from '../../../../shared/lib/utils';
import { getInstance, processOptimizationSuggestions } from './utils';

toast.configure();

const DataContext = React.createContext();

// ignore tags
const ignoreTags = [
  'guid',
  'hostname',
  'memorybytes',
  'instanceid',
  'instance_id',
  'private',
  'aws.arn'
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
                    latest(provider.dbInstanceClass), latest(awsRegion), latest(provider.storageType), latest(provider.engine), latest(provider.engineVersion), \
                    max(\`provider.readThroughput.Average\`), max(\`provider.writeThroughput.Average\`), \
                    max(\`provider.networkReceiveThroughput.Average\`), max(\`provider.networkTransmitThroughput.Average\`), \
                    max(\`provider.readIops.Average\`), max(\`provider.writeIops.Average\`), \
                    latest(provider.allocatedStorageBytes), latest(provider.freeStorageSpaceBytes.Average), \
                    max(\`provider.databaseConnections.Average\`), max(\`provider.cpuUtilization.Average\`), \
                    max(\`provider.readLatency.Average\`), max(\`provider.writeLatency.Average\`), \
                    max(\`provider.swapUsage\`), max(\`provider.swapUsageBytes.Average\`), \
                    max(\`provider.freeableMemory.Average\`) LIMIT 1`;

const RdsRecentSampleQuery = `FROM DatastoreSample SELECT count(*) SINCE 12 hours ago LIMIT 1`;

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
        recentSample: nrdbQuery(nrql: "${RdsRecentSampleQuery}", timeout: 30000) {
          results
        }
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
      rules: {}
    };
  }

  async componentDidMount() {
    const rdsUserConfig = await getCollection('rdsOptimizationConfig', 'main');
    await this.setRdsUserConfig(rdsUserConfig);

    // fetch entities
    this.setState({ fetchingEntities: true }, () => {
      this.fetchEntities();
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const { timepickerEnabled, timeRange } = this.props;
    if (timepickerEnabled && prevProps.timeRange !== timeRange) {
      this.setState({ timeRange, fetchingEntities: true }, () => {
        console.log('post process with time');
        this.fetchEntities();
      });
    }
  }

  setRdsUserConfig = config => {
    return new Promise(resolve => {
      let rules = config;
      const defaultRules = {
        cpu: 50,
        cpuStale: 10,
        memory: 50,
        memoryStale: 10,
        storageUsage: 50,
        storageUsageStale: 10,
        connections: 5,
        connectionsStale: 2,
        txStale: 10,
        rxStale: 10,
        readStale: 10,
        writeStale: 10
      };

      // if rules not set, set some defaults
      if (
        rules === undefined ||
        rules === null ||
        Object.keys(rules).length === 0
      ) {
        console.log('rds applying default rules');
        rules = { ...defaultRules };
      } else {
        console.log('rds checking saved rules');
        // if config is missing a rule apply a default automatically
        Object.keys(defaultRules).forEach(rule => {
          if (rules[rule] === undefined || rules[rule] === null) {
            rules[rule] = defaultRules[rule];
          }
        });
      }

      this.setState({ rules: { ...rules } }, () => {
        resolve(true);
      });
    });
  };

  //
  updateDataState = stateData =>
    new Promise((resolve, reject) => {
      this.setState(stateData, () => {
        resolve(true);
      });
    });

  fetchEntities = async nextCursor => {
    this.props.storeState({ selectedGroup: null });
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

    const pricingPromises = [];

    completeEntities.forEach((e, index) => {
      // simply datastoreSample access
      const datastoreSample =
        (((e || {}).datastoreSample || {}).results || {})[0] || {};
      completeEntities[index].datastoreSample = datastoreSample;

      const recentEvents =
        ((((e || {}).recentSample || {}).results || {})[0] || {}).count || 0;
      completeEntities[index].recentEvents = recentEvents;

      completeEntities[index].datastoreSample.storageUsage =
        ((datastoreSample['latest.provider.allocatedStorageBytes'] -
          datastoreSample['latest.provider.freeStorageSpaceBytes.Average']) /
          datastoreSample['latest.provider.allocatedStorageBytes']) *
        100;

      // simplify engine...
      let engine = datastoreSample['latest.provider.engine'];
      const engineVersion = datastoreSample['latest.provider.engineVersion'];

      if (engine.includes('aurora')) {
        datastoreSample.aurora = true;
        engine = engine.replace('aurora-', '');
      }

      if (engine === 'postgres') engine = 'postgresql';
      if (engine.includes('sqlserver')) engine = 'sqlserver';

      if (engine === 'aurora') {
        if (engineVersion.includes('mysql')) {
          engine = 'mysql';
        }
        if (engineVersion.includes('mariadb')) {
          engine = 'mariadb';
        }
        if (engineVersion.includes('oracle')) {
          engine = 'oracle';
        }
        if (engineVersion.includes('postgres')) {
          engine = 'postgresql';
        }
        if (engineVersion.includes('sqlserver')) {
          engine = 'sqlserver';
        }
      }

      datastoreSample['latest.provider.engine'] = engine;

      // get instance pricing
      pricingPromises.push(
        getInstance(
          datastoreSample['latest.awsRegion'],
          datastoreSample['latest.provider.dbInstanceClass'],
          datastoreSample['latest.provider.engine'],
          index
        )
      );
    });

    const pricingData = await Promise.all(pricingPromises);
    pricingData.forEach(d => {
      if (d) {
        completeEntities[d.index].pricing = d;

        if (d && d[0]) {
          const { vcpu, memory } = d[0].attributes;
          completeEntities[d.index].datastoreSample.memory = memory;
          completeEntities[d.index].datastoreSample.memoryBytes =
            memory.split(' ')[0] * 1.074e9; // convert GiB to Bytes

          // calculate memory usage here as NR doesn't have the RDS instances available memory
          completeEntities[d.index].datastoreSample.memoryUsage =
            ((completeEntities[d.index].datastoreSample.memoryBytes -
              completeEntities[d.index].datastoreSample[
                'max.provider.freeableMemory.Average'
              ]) /
              completeEntities[d.index].datastoreSample.memoryBytes) *
            100;
          completeEntities[d.index].datastoreSample.vcpu = vcpu;
          completeEntities[d.index].datastoreSample.price =
            d[0].onDemandPrice.pricePerUnit.USD;
          // duplicated to work with sort by
          completeEntities[d.index].datastoreSample.currentSpend =
            d[0].onDemandPrice.pricePerUnit.USD;
        }
      }
    });

    const optimizationPromises = completeEntities.map((e, index) =>
      processOptimizationSuggestions(e, index, this.state.rules)
    );

    await Promise.all(optimizationPromises);

    console.log(completeEntities);

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

    completeEntities = completeEntities.filter(
      e =>
        e.recentEvents > 0 &&
        e.datastoreSample['latest.provider.engine'] !== 'docdb'
    );

    return {
      completeEntities,
      tags: tags.filter((v, i, a) => a.findIndex(t => t.key === v.key) === i)
    };
  };

  render() {
    const { children } = this.props;

    return (
      <DataContext.Provider
        value={{
          ...this.state,
          updateDataState: this.updateDataState,
          fetchEntities: this.fetchEntities
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
