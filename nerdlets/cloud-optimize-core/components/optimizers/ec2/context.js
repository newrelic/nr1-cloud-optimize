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
import { NrqlQuery, NerdGraphQuery } from 'nr1';
import queue from 'async/queue';
import { getCollection, validateRegion } from '../../../../shared/lib/utils';
import { processOptimizationSuggestions } from './utils';

const pricingURL = `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com`;

toast.configure();

const DataContext = React.createContext();

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

export const computeQuery = (accountId, keys) => `{
  actor {
    account(id: ${accountId}) {
      nrql(query: "FROM ComputeSample SELECT max(provider.cpuUtilization.Maximum) as 'maxCpuUtilization', latest(ec2InstanceType), latest(systemMemoryBytes), latest(awsRegion) ${
        keys.length > 0 ? ',' : ''
      } ${keys
  .map(k => `latest(\`${k}\`)`)
  .join(
    ','
  )} FACET entityGuid, entityName WHERE ec2InstanceType is not null AND ec2InstanceType != '' AND systemMemoryBytes is not null AND provider.cpuUtilization.Maximum is not null LIMIT MAX", timeout: 60) {
        results
      }
    }
  }
}`;

export class Ec2Provider extends Component {
  constructor(props) {
    super(props);

    this.state = {
      accountId: null,
      timeRange: null,
      fetchingData: false,
      rules: {},
      computeData: null,
      headers: [],
      cloudRegions: {},
      cloudPricing: {},
      cloudPricingProgress: 0
    };
  }

  async componentDidMount() {
    const { cloudRegions } = this.props;
    this.setState({ cloudRegions });
    const userConfig = await getCollection('ec2OptimizationConfig', 'main');
    await this.setUserConfig(userConfig);
  }

  componentDidUpdate(prevProps, prevState) {
    const { timepickerEnabled, timeRange, accountId } = this.props;

    if (timepickerEnabled && prevProps.timeRange !== timeRange) {
      this.setState({ timeRange, fetchingEntities: true, accountId }, () => {
        console.log('post process with time');
        this.fetchComputeSamples();
      });
    } else if (this.state.accountId !== accountId) {
      this.setState({ accountId }, () => this.fetchComputeSamples());
    }
  }

  fetchComputeSamples = async () => {
    const { accountId } = this.state;
    if (accountId) {
      this.setState({ fetchingData: true }, async () => {
        const keys = await this.getEc2KeySet(accountId);

        const nrqlQueryData = await NerdGraphQuery.query({
          query: computeQuery(accountId, keys)
        });

        const headers = ['entityName', 'entityGuid'];

        const computeData = (
          nrqlQueryData?.data?.actor?.account?.nrql?.results || []
        ).map(d => {
          const data = {};
          Object.keys(d).forEach(key => {
            if (key === 'facet') {
              data.entityGuid = d[key][0];
              data.entityName = d[key][1];
            } else if (d[key]) {
              if (key.startsWith('latest.')) {
                const newKey = key.replace('latest.', '');
                data[newKey] = d[key];
                headers.push(newKey);
              } else {
                data[key] = d[key];
                headers.push(key);
              }
            }
          });
          return data;
        });

        this.setState({ computeData, headers, fetchingData: false }, () =>
          this.postProcessComputeData(computeData)
        );
      });
    }
  };

  postProcessComputeData = async computeData => {
    const { rules } = this.state;
    const cloudPricing = {};

    computeData.forEach(d => {
      cloudPricing[`amazon_${d.awsRegion}`] = [];
    });

    let cloudPricingCompleted = 0;
    const cloudPricingQueue = queue((task, cb) => {
      cloudPricingCompleted++;
      const cloudRegion = task.cp.split('_');
      this.getCloudPricing(cloudRegion[0], cloudRegion[1]).then(v => {
        cloudPricing[task.cp] = v;
        this.setState(
          {
            cloudPricing,
            cloudPricingProgress:
              (cloudPricingCompleted / Object.keys(cloudPricing).length) * 100
          },
          () => {
            cb();
          }
        );
      });
    }, 5);

    // fetch account optimization configs
    Object.keys(cloudPricing).forEach(cp => cloudPricingQueue.push({ cp }));

    await cloudPricingQueue.drain();

    const processedData = [];

    const instanceQueue = queue(async (task, cb) => {
      const { e } = task;
      const pricing = await this.getInstanceCloudPricing(
        'amazon',
        e.awsRegion,
        e.ec2InstanceType
      );
      const newSample = {
        ...e,
        pricing,
        price: pricing.onDemandPrice,
        currentSpend: pricing.onDemandPrice
      };
      await processOptimizationSuggestions(newSample, rules);
      processedData.push(newSample);
      cb();
    }, 5);

    computeData.forEach(e => {
      instanceQueue.push({ e });
    });

    await instanceQueue.drain();

    this.setState({ processedData });
  };

  getEc2KeySet = async accountId => {
    const keySetData = await NrqlQuery.query({
      accountId,
      query: 'FROM ComputeSample SELECT keyset()'
    });
    const keySet = keySetData?.data?.[0]?.data?.[0]?.stringKeys || [];
    return keySet.filter(key => key.startsWith('ec2Tag_'));
  };

  setUserConfig = config => {
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
        console.log('ec2 applying default rules');
        rules = { ...defaultRules };
      } else {
        console.log('ec2 checking saved rules');
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

  getCloudPricing = (cloud, region) => {
    const { cloudPricing } = this.state;
    return new Promise(resolve => {
      const currentPricing = cloudPricing[`${cloud}_${region}`] || {};
      if (Object.keys(currentPricing).length === 0) {
        const cleanRegion = validateRegion(
          cloud,
          region,
          this.state.cloudRegions,
          this.state.userConfig
        );

        fetch(`${pricingURL}/${cloud}/compute/pricing/${cleanRegion}.json`)
          .then(response => response.json())
          .then(json =>
            json?.products ? resolve(json.products) : resolve(null)
          );
      } else {
        resolve(currentPricing);
      }
    });
  };

  getInstanceCloudPricing = (cloud, region, instanceType) => {
    const { cloudPricing } = this.state;
    return new Promise(resolve => {
      const pricingKey = `${cloud}_${region}`;

      if (cloudPricing[pricingKey] && cloudPricing[pricingKey].length > 0) {
        if (instanceType) {
          // provide direct instance type price
          for (let z = 0; z < cloudPricing[pricingKey].length; z++) {
            if (cloudPricing[pricingKey][z].type === instanceType) {
              resolve(cloudPricing[pricingKey][z]);
            }
          }
          resolve(null);
        } else {
          resolve(cloudPricing[pricingKey]);
        }
      } else {
        this.getCloudPricing(cloud, region).then(value => {
          cloudPricing[pricingKey] = value;
          this.setState({ cloudPricing }, () => {
            if (instanceType) {
              for (let z = 0; z < cloudPricing[pricingKey].length; z++) {
                if (cloudPricing[pricingKey][z].type === instanceType) {
                  resolve(cloudPricing[pricingKey][z]);
                }
              }
              resolve(null);
            } else {
              resolve(value);
            }
          });
        });
      }
    });
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

export const Ec2Consumer = DataContext.Consumer;
