/* eslint 
no-console: 0,
no-async-promise-executor: 0,
require-atomic-updates: 0,
no-unused-vars: 0,
react/no-did-update-set-state: 0
*/

import React, { Component } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { NerdGraphQuery } from 'nr1';
import { Icon } from 'semantic-ui-react';
import {
  chunk,
  buildGroupByOptions,
  getCollection,
  getEntityCollection,
  getAccountCollection,
  existsInObjArray,
  roundHalf,
  tagFilterEntities
} from '../../shared/lib/utils';
import {
  entitySearchQuery,
  getWorkloadTags,
  workloadQueries,
  getEntityDataQuery
} from '../../shared/lib/queries';
import _ from 'lodash';
import { addInstanceCostTotal } from '../strategies/instances';
import pkg from '../../../package.json';
import { processEntitySamples } from '../strategies/entity-handler';
import queue from 'async/queue';

toast.configure();

const semver = require('semver');

const DataContext = React.createContext();

// use cloud optimizes s3 pricing to standardize between both nerdpacks
const pricingURL = `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com`;

// there is no need to query particular types in a workload if we can't provide optimization suggestions (yet)
// the below is used as a simple control for this and stitched at the end of the workload entity search query
const acceptedTypesInWorkload = `AND type IN ('HOST', 'VSPHEREVM', 'VSPHEREHOST', 'APPLICATION')`;

// current max supported
const entitySearchChunkValue = 25;

// how many elements to queue
const queueConcurrency = 5;

// supported clouds
const supportedClouds = ['amazon', 'azure', 'google', 'alibaba'];

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

export const categoryTypes = {
  instances: ['HOST', 'VSPHEREVM', 'VSPHEREHOST'],
  workloads: ['WORKLOAD']
  // database: ['APPLICATION'],
  // application: ['APPLICATION']
};

export const entityMetricModel = {
  instances: {
    currentSpend: 0,
    optimizedSpend: 0,
    datacenterSpend: 0,
    cloudSpend: 0,
    spotSpend: 0,
    nonSpotSpend: 0,
    optimizedNonSpotSpend: 0,
    optimizedSpotSpend: 0,
    potentialSavings: 0,
    potentialSavingsWithSpot: 0,
    staleInstances: 0,
    excludedInstances: 0,
    skippedInstances: 0,
    optimizedInstances: 0,
    amazon: 0,
    amazonSpend: 0,
    azure: 0,
    azureSpend: 0,
    google: 0,
    googleSpend: 0,
    alibaba: 0,
    alibabaSpend: 0,
    unknown: 0,
    vmware: 0
  }
};

export const optimizationDefaults = {
  enable: false,
  inclusionPeriodHours: 24,
  cpuUpper: 50,
  memUpper: 50,
  cpuMemUpperOperator: 'AND',
  staleCpu: 5,
  staleMem: 5,
  cpuMemUpperStaleOperator: 'AND',
  staleReceiveBytesPerSec: 0,
  staleTransmitBytesPerSec: 0,
  rxTxStaleOperator: 'AND',
  cpuRightSize: 0.5,
  memRightSize: 0.5,
  rightSizeOperator: '',
  discountMultiplier: 1,
  lastReportPeriod: 24,
  includedInstanceTypes: [],
  excludedInstanceTypes: [],
  excludedGuids: [],
  entityMetricTotals: {},
  defaultCloud: 'amazon',
  amazonRegion: 'us-east-1',
  azureRegion: 'westus',
  googleRegion: 'us-west1',
  alibabaRegion: 'us-east-1',
  disableMenu: false
};

export class DataProvider extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedPage: 'home',
      updatingContext: false,
      accounts: [],
      accountsObj: {},
      userConfig: null,
      entities: [],
      rawEntities: [],
      groupedEntities: [],
      workloadEntities: [],
      fetchingEntities: true,
      postProcessing: true,
      entityDataProgress: 0,
      accountConfigProgress: 0,
      cloudPricingProgress: 0,
      workloadCostProgress: 0,
      workloadConfigProgress: 0,
      workloadQueryProgress: 0,
      processedApps: [],
      processedHosts: [],
      processedWorkloads: [],
      cloudPricing: {},
      tags: [],
      selectedTags: [],
      groupBy: { value: 'account', label: 'account' },
      sortBy: { value: 'currentSpend', label: 'Current Spend' },
      orderBy: { value: 'desc', label: 'Descending' },
      groupByOptions: [],
      sortByOptions: [],
      costPeriod: { key: 3, label: 'MONTHLY', value: 'M' },
      selectedGroup: null,
      cloudRegions: {},
      timeRange: null,
      timepickerEnabled: false
    };
  }

  async componentDidMount() {
    this.checkVersion();

    let userConfig = await getCollection('optimizationConfig', 'main');
    if (!userConfig) {
      userConfig = { ...optimizationDefaults };
    }

    this.fetchCloudRegions();

    this.setState({ userConfig }, () => {
      // handle incoming props with postProcessEntities, else run fetchEntities for default view
      this.fetchEntities();
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const { timepickerEnabled } = this.state;
    if (
      this.props.platformState &&
      prevProps.platformState &&
      timepickerEnabled &&
      prevProps.platformState.timeRange !== this.props.platformState.timeRange
    ) {
      this.setState({ timeRange: this.props.platformState.timeRange }, () => {
        console.log('post process with time');
        this.postProcessEntities();
      });
    }
  }

  fetchCloudRegions = () => {
    const { cloudRegions } = this.state;
    const cloudRegionPromises = supportedClouds.map(cloud =>
      fetch(`${pricingURL}/${cloud}/regions.json`).then(response =>
        response.json()
      )
    );

    Promise.all(cloudRegionPromises).then(values => {
      values.forEach((v, i) => {
        cloudRegions[supportedClouds[i]] = v;
      });
      this.setState({ cloudRegions });
    });
  };

  fetchEntities = async nextCursor => {
    // intentionally do not query tags now, so that we can support incoming entities that only contain a guid and type
    const result = await NerdGraphQuery.query({
      query: entitySearchQuery(nextCursor)
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
      this.fetchEntities(entitySearchResult.nextCursor);
    } else if (
      !entitySearchResult.nextCursor ||
      entitySearchResult.entities.length === 0
    ) {
      // completed
      this.setState({ fetchingEntities: false }, () =>
        this.postProcessEntities()
      );
    }
  };

  postProcessEntities = async guids => {
    this.setState(
      {
        postProcessing: true,
        entityDataProgress: 0,
        accountConfigProgress: 0,
        cloudPricingProgress: 0
      },
      () => {
        toast.info(loadingMsg('Processing entities...'), {
          autoClose: false,
          containerId: 'C',
          toastId: 'processEntities'
        });
      }
    );

    let { rawEntities } = this.state;
    rawEntities = [...rawEntities, ...(guids || [])];

    const nonWorkloadEntities = [];
    let workloadEntities = [];

    for (let z = 0; z < rawEntities.length; z++) {
      if (rawEntities[z].type === 'WORKLOAD') {
        workloadEntities.push(rawEntities[z]);
      } else {
        nonWorkloadEntities.push(rawEntities[z]);
      }
    }

    // get workload guid datacenter docs & entities first
    // this way pricing can be retrieved and used for non public cloud entities
    if (workloadEntities.length > 0) {
      workloadEntities = await this.processWorkloads(workloadEntities);
    }

    const tempEntities = await this.getEntityData(nonWorkloadEntities);

    // stitch relevant entities back into workloads so on prem cost/cu calculations can be made
    workloadEntities = this.addEntityDataToWorkload(
      tempEntities,
      workloadEntities
    );
    this.calculateWorkloadDatacenterCost(workloadEntities);

    // get pricing, matches and optimized matches and perform any decoration if required
    const { entities, entityMetricTotals } = await this.processEntities(
      tempEntities,
      workloadEntities
    );

    // run again to stitch freshly processed data
    workloadEntities = this.addEntityDataToWorkload(entities, workloadEntities);
    const groupedEntities = _.groupBy(entities, e => e.type);
    const groupByOptions = buildGroupByOptions(entities);

    this.setState(
      {
        entities,
        groupedEntities,
        workloadEntities,
        originalWorkloadEntities: workloadEntities,
        entityMetricTotals,
        postProcessing: false,
        groupByOptions
      },
      () => {
        toast.update('processEntities', {
          autoClose: 3000,
          type: toast.TYPE.SUCCESS,
          containerId: 'C',
          render: successMsg('Finished processing entities.')
        });
      }
    );
  };

  // refresh workloads
  getWorkloadDocs = guid => {
    this.setState({ disableMenu: true }, async () => {
      const { originalWorkloadEntities } = this.state;

      if (!guid) {
        const workloadDocPromises = originalWorkloadEntities.map(wl =>
          getEntityCollection('dcDoc', wl.guid, 'dcDoc')
        );

        await Promise.all(workloadDocPromises).then(values => {
          values.forEach((v, i) => {
            if (!originalWorkloadEntities[i].dcDoc) {
              originalWorkloadEntities[i].dcDoc = v;
            }
          });
        });
      } else {
        const dcDoc = await getEntityCollection('dcDoc', guid, 'dcDoc');
        for (let z = 0; z < originalWorkloadEntities.length; z++) {
          if (guid === originalWorkloadEntities[z].guid) {
            originalWorkloadEntities[z].dcDoc = dcDoc;
            break;
          }
        }
      }

      this.calculateWorkloadDatacenterCost(originalWorkloadEntities);

      const { entities, entityMetricTotals } = await this.processEntities(
        [...this.state.entities],
        originalWorkloadEntities
      );

      const groupedEntities = _.groupBy(entities, e => e.type);
      const groupByOptions = buildGroupByOptions(entities);

      this.setState(
        {
          entities,
          originalWorkloadEntities,
          groupedEntities,
          groupByOptions,
          entityMetricTotals,
          disableMenu: false
        },
        () => {
          this.updateDataState(null, ['filterEntities']);
        }
      );
    });
  };

  // calculateDatacenterCost
  calculateWorkloadDatacenterCost = workloadEntities => {
    for (let z = 0; z < workloadEntities.length; z++) {
      const doc = workloadEntities[z].dcDoc;
      if (doc) {
        const costTotal = { value: 0 };

        if (doc && doc.costs) {
          Object.keys(doc.costs).forEach(key => {
            if (!costTotal[key]) {
              costTotal[key] = 0;
            }

            doc.costs[key].forEach(cost => {
              const finalCost =
                cost.units * cost.rate * (12 / cost.recurringMonths);
              costTotal.value += finalCost;
              costTotal[key] += finalCost;
            });
          });
        }

        let totalCU = 0;

        if (workloadEntities[z].entityData) {
          workloadEntities[z].entityData.forEach(entity => {
            let systemSample = null;

            // do this transformation earlier
            if (entity.systemSample) {
              if (entity.systemSample.results) {
                systemSample = entity.systemSample.results[0];
              } else {
                systemSample = entity.systemSample;
              }
            }

            if (entity.vsphereVmSample) {
              if (entity.vsphereVmSample.results) {
                systemSample = entity.vsphereVmSample.results[0];
              } else {
                systemSample = entity.vsphereVmSample;
              }
            }

            if (entity.vsphereHostSample) {
              if (entity.vsphereHostSample.results) {
                entity.vsphereHostSample = entity.vsphereHostSample.results[0];
              }
            }

            if (systemSample && systemSample['latest.entityGuid']) {
              totalCU +=
                systemSample['latest.coreCount'] +
                systemSample['latest.memoryTotalBytes'] * 1e-9; // BYTES TO GB
            }
          });
        }

        workloadEntities[z].costPerCU =
          totalCU === 0 || costTotal === 0
            ? 0
            : costTotal.value / 8760 / totalCU;

        workloadEntities[z].costTotal = costTotal;
        workloadEntities[z].totalCU = totalCU;
      }
    }
  };

  // addEntityDataToWorkload
  addEntityDataToWorkload = (entities, workloadEntities) => {
    for (let z = 0; z < workloadEntities.length; z++) {
      workloadEntities[z].entityData = [];
      for (let y = 0; y < workloadEntities[z].evaluatedEntities.length; y++) {
        const entityIndex = existsInObjArray(
          entities,
          'guid',
          workloadEntities[z].evaluatedEntities[y].guid
        );
        if (entityIndex) {
          workloadEntities[z].entityData.push(entities[entityIndex]);
        }
      }
    }
    return workloadEntities;
  };

  // process entity data
  processEntities = async (entities, workloadEntities) => {
    const entityMetricTotals = JSON.parse(JSON.stringify(entityMetricModel));
    const accounts = [];
    const accountsObj = {};
    const cloudPricing = {};
    let tags = [...this.state.tags];

    entities.forEach(e => {
      processEntitySamples(e);
      accountsObj[e.account.id] = { name: e.account.name };
      if (e.cloud) {
        cloudPricing[`${e.cloud}_${e.cloudRegion}`] = [];
        e.tags.push({ key: 'cloud', values: [e.cloud] });
        e.tags.push({ key: 'region', values: [e.cloudRegion] });
      }

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

    let accountCfgCompleted = 0;
    let accountsToCheck = 0;
    const accountCfgQueue = queue((task, cb) => {
      accountCfgCompleted++;
      getAccountCollection(task.id, 'optimizationConfig', 'main').then(v => {
        accountsObj[task.id].optimizationConfig = v;
        accountsObj[task.id].id = task.id;
        accounts.push(accountsObj[task.id]);
        if (v) {
          if (v.amazonRegion)
            cloudPricing[
              `amazon_${v.amazonRegion || optimizationDefaults.amazonRegion}`
            ] = [];
          if (v.googleRegion)
            cloudPricing[
              `google_${v.googleRegion || optimizationDefaults.googleRegion}`
            ] = [];
          if (v.azureRegion)
            cloudPricing[
              `azure_${v.azureRegion || optimizationDefaults.azureRegion}`
            ] = [];
          if (v.alibabaRegion)
            cloudPricing[
              `alibaba_${v.alibabaRegion || optimizationDefaults.alibabaRegion}`
            ] = [];
        }
        this.setState(
          {
            accountConfigProgress: (accountCfgCompleted / accountsToCheck) * 100
          },
          () => {
            cb();
          }
        );
      });
    }, queueConcurrency);

    // get cloud pricing
    const uc = this.state.userConfig;
    cloudPricing[
      `amazon_${uc.amazonRegion || optimizationDefaults.amazonRegion}`
    ] = [];
    cloudPricing[
      `google_${uc.googleRegion || optimizationDefaults.googleRegion}`
    ] = [];
    cloudPricing[
      `azure_${uc.azureRegion || optimizationDefaults.azureRegion}`
    ] = [];
    cloudPricing[
      `alibaba_${uc.alibabaRegion || optimizationDefaults.alibabaRegion}`
    ] = [];

    let cloudPricingCompleted = 0;
    const cloudPricingQueue = queue((task, cb) => {
      cloudPricingCompleted++;
      const cloudRegion = task.cp.split('_');

      this.getCloudPricing(cloudRegion[0], cloudRegion[1]).then(v => {
        cloudPricing[task.cp] = v;
        this.setState(
          {
            cloudPricingProgress:
              (cloudPricingCompleted / Object.keys(cloudPricing).length) * 100
          },
          () => {
            cb();
          }
        );
      });
    }, queueConcurrency);

    // fetch account optimization configs
    Object.keys(cloudPricing).forEach(cp => cloudPricingQueue.push({ cp }));
    // fetch account optimization configs
    Object.keys(accountsObj).forEach(id => {
      if (!accountsObj[id].optimizationConfig) {
        accountsToCheck++;
        accountCfgQueue.push({ id });
      }
    });

    await Promise.all([cloudPricingQueue.drain(), accountCfgQueue.drain()]);

    tags = _.chain(tags)
      .uniqBy(t => t.key)
      .sortBy('key')
      .value();

    await this.storeState({
      accountsObj,
      accounts,
      cloudPricing,
      tags
    });

    const processedEntityPromises = entities.map(e => {
      const {
        optimizationConfig,
        optimizedWith,
        workload
      } = this.getOptimizationConfig(e, workloadEntities);

      if (workload) {
        e.costPerCU = workload.costPerCU || 0;
      }

      e.optimizedWith = optimizedWith;
      return this.processEntity(e, optimizationConfig, entityMetricTotals);
    });

    await Promise.all(processedEntityPromises);

    return { entities, entityMetricTotals };
  };

  storeState = newState => {
    return new Promise(resolve => {
      this.setState(newState, () => {
        resolve(true);
      });
    });
  };

  processEntity = async (e, optimizationConfig, entityMetricTotals) => {
    // if system sample or vsphere get instance pricing
    if (e.systemSample || e.vsphereHostSample || e.vsphereVmSample) {
      if (e.cloud && e.cloudRegion && e.systemSample['latest.instanceType']) {
        // assess cloud instance
        e.instanceResult = await this.getInstanceCloudPricing(
          e.cloud,
          e.cloudRegion,
          e.systemSample['latest.instanceType']
        );
      } else if (!e.cloud) {
        if (!isNaN(e.coreCount) && !isNaN(e.memoryGb)) {
          e.matchedInstances = await this.getCloudInstances(
            optimizationConfig,
            e.coreCount,
            Math.round(e.memoryGb)
          );
        }

        // check if exists in workload and if DC costing is available
        if (e.costPerCU >= 0) {
          const instanceCU = Math.round(e.memoryGb + e.coreCount);
          e.datacenterSpend = instanceCU * e.costPerCU;
        }
      }

      // get optimized matches
      if (!optimizationConfig) {
        e.optimizedData = null;
      } else {
        e.optimizedData = await this.getOptimizedMatches(
          e.instanceResult,
          e.systemSample || e.vsphereVmSample || e.vsphereHostSample,
          optimizationConfig,
          e.cloud,
          e.costPerCU
        );
      }

      // perform instance calculations
      addInstanceCostTotal(entityMetricTotals, e);
    }
  };

  getCloudInstances = async (optimizationConfig, cpu, mem, basePrice) => {
    const defaultCloud =
      optimizationConfig.defaultCloud || optimizationDefaults.defaultCloud;
    const defaultRegion =
      optimizationConfig[`${defaultCloud}Region`] ||
      optimizationDefaults[`${defaultCloud}Region`];
    const cloudPrices = await this.getInstanceCloudPricing(
      defaultCloud,
      defaultRegion
    );

    if (cloudPrices) {
      const exactMatchedProducts = {};
      for (let z = 0; z < cloudPrices.length; z++) {
        if (!exactMatchedProducts[cloudPrices[z].category]) {
          exactMatchedProducts[cloudPrices[z].category] = null;
        }

        if (this.checkIncludeExclude(optimizationConfig, cloudPrices[z])) {
          break;
        }

        if (
          cloudPrices[z].cpusPerVm === cpu &&
          cloudPrices[z].memPerVm === mem &&
          basePrice >= cloudPrices[z].onDemandPrice
        ) {
          exactMatchedProducts[cloudPrices[z].category] = cloudPrices[z];
        }
      }

      const nextMatchedProducts = {};

      // get cheapest from each missing price category
      Object.keys(exactMatchedProducts).forEach(category => {
        if (!exactMatchedProducts[category]) {
          for (let z = 0; z < cloudPrices.length; z++) {
            if (this.checkIncludeExclude(optimizationConfig, cloudPrices[z])) {
              break;
            }

            if (
              cloudPrices[z].category === category &&
              cloudPrices[z].cpusPerVm >= cpu &&
              cloudPrices[z].memPerVm >= mem &&
              basePrice >= cloudPrices[z].onDemandPrice
            ) {
              nextMatchedProducts[category] = cloudPrices[z];
              break;
            }
          }
          delete exactMatchedProducts[category];
        }
      });

      const matchedInstances = { exactMatchedProducts, nextMatchedProducts };

      return matchedInstances;
    } else {
      return null;
    }
  };

  // check the include exclude filters, and return true if we need to skip this product
  checkIncludeExclude = (config, product) => {
    if (config && config.enable) {
      // skip excluded instances
      if (config.excludedInstanceTypes) {
        for (let y = 0; y < config.excludedInstanceTypes.length; y++) {
          if (product.type.includes(config.excludedInstanceTypes[y].value)) {
            return true;
          }
        }
      }
      // only keep included instances
      if (
        config.includedInstanceTypes &&
        config.includedInstanceTypes.length > 0
      ) {
        let isIncluded = false;
        for (let y = 0; y < config.includedInstanceTypes.length; y++) {
          if (product.type.includes(config.includedInstanceTypes[y].value)) {
            isIncluded = true;
          }
        }

        if (!isIncluded) return true;
      }
    }

    return false;
  };

  getOptimizationConfig = (e, workloadEntities) => {
    const { accountsObj } = this.state;
    let optimizationConfig = null;
    let optimizedWith = null;

    // check if guid exists in a workload to pull optimization config
    const workload = this.checkGuidInWorkload(e.guid, workloadEntities);
    if (workload && workload.optimizationConfig) {
      optimizationConfig = workload.optimizationConfig;
      optimizedWith = 'workloadConfig';
    }

    // if no workload config, check account storage
    if (!optimizationConfig) {
      if (accountsObj[e.account.id].optimizationConfig) {
        optimizationConfig = accountsObj[e.account.id].optimizationConfig;
        optimizedWith = 'accountConfig';
      }
    }

    // if no workload config, user settings
    // revist later
    // separate config and pricing calls to perform upfront
    if (!optimizationConfig) {
      optimizationConfig = this.state.userConfig;
      optimizedWith = 'userConfig';
    }

    return { optimizationConfig, optimizedWith, workload };
  };

  getAccountOptimizationConfig = (accountId, accountName) => {
    return new Promise(resolve => {
      const { accountsObj } = this.state;
      if (accountsObj.accountId && accountsObj.accountId.optimizationConfig) {
        resolve(accountsObj.accountId.optimizationConfig);
      } else if (
        !accountsObj[accountId] ||
        (accountsObj[accountId] &&
          !accountsObj[accountId].checkedOptimizationConfig)
      ) {
        accountsObj[accountId] = { name: accountName };
        getAccountCollection(accountId, 'optimizationConfig', 'main').then(
          value => {
            accountsObj[accountId].checkedOptimizationConfig = true;

            if (value) {
              accountsObj[accountId].optimizationConfig = value;
            }

            this.setState({ accountsObj }, () => {
              resolve(value);
            });
          }
        );
      } else {
        resolve(null);
      }
    });
  };

  getCloudPricing = (cloud, region) => {
    return new Promise(resolve => {
      fetch(`${pricingURL}/${cloud}/compute/pricing/${region}.json`)
        .then(response => {
          return response.json();
        })
        .then(json => {
          if (json && json.products) {
            resolve(json.products);
          } else {
            resolve(null);
          }
        });
    });
  };

  // get cloud pricing
  // checks cloud pricing in state, else will fetch and store
  getInstanceCloudPricing = (cloud, region, instanceType) => {
    const { cloudPricing } = this.state;
    return new Promise(resolve => {
      const pricingKey = `${cloud}_${region}`;
      if (cloudPricing[pricingKey]) {
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

  // collect entity data
  getEntityData = async nonWorkloadEntities => {
    const { timeRange } = this.state;
    // chunk entity guids
    const guidChunks = chunk(
      nonWorkloadEntities.map(e => e.guid),
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

    return completeEntities;
  };

  trueIndex = (chunkedIndex, valueIndex) => {
    if (chunkedIndex === 0) {
      return valueIndex;
    } else {
      const startIndex = chunkedIndex * entitySearchChunkValue;
      return startIndex + valueIndex;
    }
  };

  // search for non cloud entity type within workload for on prem costing
  checkGuidInWorkload = (guid, workloads) => {
    for (let z = 0; z < workloads.length; z++) {
      for (let y = 0; y < workloads[z].evaluatedEntities.length; y++) {
        if (guid === workloads[z].evaluatedEntities[y].guid) {
          return workloads[z];
        }
      }
    }
    return null;
  };

  processWorkloads = async workloadGuids => {
    // get docs
    // // get dcDoc

    let workloadCostCompleted = 0;
    const workloadCostQueue = queue((task, cb) => {
      workloadCostCompleted++;
      getEntityCollection('dcDoc', task.guid, 'dcDoc').then(v => {
        workloadGuids[task.i].dcDoc = v;
        this.setState(
          {
            workloadCostProgress:
              (workloadCostCompleted / workloadGuids.length) * 100
          },
          () => {
            cb();
          }
        );
      });
    }, queueConcurrency);

    let workloadCfgCompleted = 0;
    const workloadCfgQueue = queue((task, cb) => {
      workloadCfgCompleted++;
      getEntityCollection('optimizationConfig', task.guid, 'main').then(v => {
        workloadGuids[task.i].optimizationConfig = v;
        this.setState(
          {
            workloadConfigProgress:
              (workloadCfgCompleted / workloadGuids.length) * 100
          },
          () => {
            cb();
          }
        );
      });
    }, queueConcurrency);

    workloadGuids.forEach((w, i) => {
      workloadCostQueue.push({ guid: w.guid, i });
      workloadCfgQueue.push({ guid: w.guid, i });
    });

    await Promise.all([workloadCostQueue.drain(), workloadCfgQueue.drain()]);

    // get queries
    const entityWorkloadQueryPromises = workloadGuids.map(wl =>
      NerdGraphQuery.query({
        query: workloadQueries,
        variables: { guid: wl.guid, accountId: wl.account.id }
      })
    );

    await Promise.all(entityWorkloadQueryPromises).then(values => {
      values.forEach(async (v, i) => {
        const workload =
          ((((v || {}).data || {}).actor || {}).account || {}).workload || null;

        const collection = workload.collection || null;

        if (collection) {
          workloadGuids[i].name = collection.name;
          workloadGuids[i].entitySearchQuery = collection.entitySearchQuery; // <- evaluate this query
          workloadGuids[i].entities = collection.entities;
          workloadGuids[i].permalink = collection.permalink;
        }

        // if (!workloadGuids[i].entitySearchQuery) {
        // }
      });
    });

    // stitch resolved entities
    const evaluateQueryPromises = workloadGuids.map(wl =>
      this.evaluateWorkloadEntitySearchQuery(wl.entitySearchQuery)
    );

    await Promise.all(evaluateQueryPromises).then(values => {
      values.forEach((v, i) => {
        workloadGuids[i].evaluatedEntities = v;
      });
    });

    // chunk and stitch tags
    const entityWorkloadChunks = chunk(workloadGuids, entitySearchChunkValue);
    const entityWorkloadTagPromises = entityWorkloadChunks.map(chunk =>
      NerdGraphQuery.query({
        query: getWorkloadTags,
        variables: { guids: chunk.map(wl => wl.guid) }
      })
    );

    await Promise.all(entityWorkloadTagPromises).then(values => {
      const currentTags = this.state.tags;
      let tags = [...currentTags];

      values.forEach(v => {
        const results = (((v || {}).data || {}).actor || {}).entities || [];
        results.forEach(r => {
          const checkIndex = existsInObjArray(workloadGuids, 'guid', r.guid);
          if (checkIndex !== false) {
            workloadGuids[checkIndex].tags = r.tags;

            workloadGuids[checkIndex].tags.forEach(t => {
              // unpack tags for easy grouping
              workloadGuids[checkIndex][`tag.${t.key}`] = t.values[0] || true;

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
          }
        });
      });
      tags = _.chain(tags)
        .uniqBy(t => t.key)
        .sortBy('key')
        .value();
      this.setState({ tags });
    });

    return workloadGuids;
  };

  evaluateWorkloadEntitySearchQuery = (query, cursor, entities) => {
    return new Promise(resolve => {
      if (!entities) {
        entities = [];
      }

      const ngQuery = `{
      actor {
        entitySearch(query: "${query} ${acceptedTypesInWorkload}") {
          results${cursor ? `(cursor: "${cursor}")` : ''} {
            entities {
              guid
              type
            }
            nextCursor
          }
        }
      }
    }`;

      NerdGraphQuery.query({
        query: ngQuery
      }).then(async v => {
        const results =
          ((((v || {}).data || {}).actor || {}).entitySearch || {}).results ||
          [];

        if (results.entities && results.entities.length > 0) {
          entities = [...entities, ...results.entities];
        }

        if (results.nextCursor) {
          // seems to work as intended
          console.log('recursing');
          const recursedEntities = await this.evaluateWorkloadEntitySearchQuery(
            query,
            results.nextCursor,
            entities
          );
          resolve(recursedEntities);
        } else {
          resolve(entities);
        }
      });
    });
  };

  checkVersion = () => {
    fetch(
      'https://raw.githubusercontent.com/newrelic/nr1-cloud-optimize/master/package.json'
    )
      .then(response => {
        return response.json();
      })
      .then(repoPackage => {
        if (pkg.version === repoPackage.version) {
          console.log(`Running latest version: ${pkg.version}`);
        } else if (semver.lt(pkg.version, repoPackage.version)) {
          toast.warn(
            <a
              onClick={() =>
                window.open(
                  'https://github.com/newrelic/nr1-cloud-optimize/',
                  '_blank'
                )
              }
            >{`New version available: ${repoPackage.version}`}</a>,
            {
              autoClose: 5000,
              containerId: 'C'
            }
          );
        } else if (semver.lt(repoPackage.version, pkg.version)) {
          console.log(`Running newer version: ${pkg.version}`);
        } else {
          console.log(`Running unknown version: ${pkg.version}`);
        }
      });
  };

  updateDataState = (stateData, actions) => {
    return new Promise((resolve, reject) => {
      // actions
      (actions || []).forEach(action => {
        switch (action) {
          case 'filterEntities': {
            const { selectedTags } = this.state;
            const { entities, originalWorkloadEntities } = this.state;
            const groupedEntities = _.groupBy(
              tagFilterEntities(entities, selectedTags),
              e => e.type
            );
            const workloadEntities = tagFilterEntities(
              originalWorkloadEntities,
              selectedTags
            );
            this.setState({
              groupedEntities,
              workloadEntities
            });
            break;
          }
        }
      });

      // state updates
      if (stateData) {
        const newState = { ...stateData, updatingContext: true };

        this.setState(newState, () => {
          // do stuff with updated state if required
          if (newState.selectedTags) {
            const { entities, originalWorkloadEntities } = this.state;
            const groupedEntities = _.groupBy(
              tagFilterEntities(entities, newState.selectedTags),
              e => e.type
            );
            const workloadEntities = tagFilterEntities(
              originalWorkloadEntities,
              newState.selectedTags
            );
            this.setState({
              groupedEntities,
              workloadEntities
            });
          }

          // completed update
          this.setState({ updatingContext: false }, () => {
            resolve(true);
          });
        });
      }

      resolve(true);
    });
  };

  getOptimizedMatches = async (
    instanceResult,
    systemSample,
    optimizationConfig,
    cloud,
    costPerCU
  ) => {
    // if (!optimizationConfig || !optimizationConfig.enable) return null;

    const optimizationData = {};
    const maxCpu = systemSample['max.cpuPercent'];
    const maxMem = systemSample['max.memoryPercent'];

    // assess inclusion period
    const timeSinceLastReported =
      new Date().getTime() - systemSample['latest.timestamp'];
    if (
      timeSinceLastReported >
      parseFloat(optimizationConfig.inclusionPeriodHours || 0) * 3600000
    ) {
      return { state: 'excluded' };
    }

    // assess staleness params
    const cpuStale =
      optimizationConfig.staleCpu !== 0 && maxCpu < optimizationConfig.staleCpu;

    const memStale =
      optimizationConfig.staleCpu !== 0 && maxMem < optimizationConfig.staleMem;

    const cpuMemUpperStaleOperator =
      optimizationConfig.cpuMemUpperStaleOperator || 'AND';

    if (
      (cpuMemUpperStaleOperator === 'AND' && cpuStale && memStale) ||
      (cpuMemUpperStaleOperator === 'OR' && (cpuStale || memStale))
    ) {
      return { state: 'stale' };
    }

    // optimize
    // assess upper limit params
    const cpuOptimize =
      optimizationConfig.cpuUpper !== 0 && maxCpu < optimizationConfig.cpuUpper;

    const memOptimize =
      optimizationConfig.memUpper !== 0 && maxMem < optimizationConfig.memUpper;

    const cpuMemUpperOperator = optimizationConfig.cpuMemUpperOperator || 'AND';

    if (
      (cpuMemUpperOperator === 'AND' && cpuOptimize && memOptimize) ||
      (cpuMemUpperOperator === 'OR' && (cpuOptimize || memOptimize))
    ) {
      // optimize
      let cpuCount = 0;
      let memGb = 0;
      if (instanceResult) {
        cpuCount = instanceResult.cpusPerVm;
        memGb = instanceResult.memPerVm;
      } else {
        cpuCount = systemSample['latest.coreCount'];
        memGb = systemSample['latest.memoryTotalBytes'] * 1e-9;
      }

      cpuCount = roundHalf(cpuCount * optimizationConfig.cpuRightSize);
      memGb = roundHalf(memGb * optimizationConfig.cpuRightSize);

      // provided an onprem/dc estimation
      if (!cloud) {
        optimizationData.dcResult = {
          cpusPerVm: cpuCount,
          memPerVm: memGb,
          onDemandPrice: Math.round(cpuCount + memGb) * (costPerCU || 0),
          type: `cpu: ${cpuCount}, memGb: ${memGb}`
        };
      }

      optimizationData.matchedInstances = await this.getCloudInstances(
        optimizationConfig,
        cpuCount,
        memGb,
        (instanceResult || {}).onDemandPrice || 0
      );

      if (optimizationData.matchedInstances) {
        if (
          optimizationData.matchedInstances.exactMatchedProducts &&
          Object.keys(optimizationData.matchedInstances.exactMatchedProducts)
            .length > 0
        ) {
          optimizationData.state = 'optimized-exact';
        } else if (
          optimizationData.matchedInstances.nextMatchedProducts &&
          Object.keys(optimizationData.matchedInstances.nextMatchedProducts)
            .length > 0
        ) {
          optimizationData.state = 'optimized-next';
        }
      }
    }

    return optimizationData;
  };

  // fetch data as required, supply array things to fetch
  dataFetcher = async actions => {
    console.log('context dataFetcher');
    const dataPromises = [];
    const content = [];

    actions.forEach(action => {
      switch (action) {
        case 'accounts': {
          content.push(action);
          const accountsQuery = `{actor {accounts {name id}}}`;
          dataPromises.push(NerdGraphQuery.query({ query: accountsQuery }));
          break;
        }
      }
    });

    await Promise.all(dataPromises).then(async values => {
      const data = {};
      values.forEach((value, i) => {
        switch (content[i]) {
          case 'accounts':
            data.accounts =
              (((value || {}).data || {}).actor || {}).accounts || [];
            break;
        }
      });

      this.setState(data);
    });
  };

  render() {
    const { children } = this.props;

    return (
      <DataContext.Provider
        value={{
          ...this.state,
          updateDataState: this.updateDataState,
          postProcessEntities: this.postProcessEntities,
          getWorkloadDocs: this.getWorkloadDocs
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

export const DataConsumer = DataContext.Consumer;
