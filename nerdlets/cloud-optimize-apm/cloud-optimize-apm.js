import React from 'react';
import PropTypes from 'prop-types';
import { AutoSizer } from 'nr1';
import {
  nerdGraphQuery,
  getEntityData,
  getInfraHost,
  getInstanceData,
  getContainerPerformance
} from './utils';
import MenuBar from './components/menu-bar';
import { getDocument, writeDocument } from '../shared/lib/utils';
import { processSample, groupInstances } from '../shared/lib/processor';
import { Grid, Loader, Dimmer, Segment } from 'semantic-ui-react';
import MainCharts from './components/main-charts';
import OptimizationCandidates from './components/optimization-candidates';
import ContainerOptimization from './components/container-optimization';
import HostMetrics from './components/host-metrics';
import _ from 'lodash';

export default class CloudOptimizeApm extends React.Component {
  static propTypes = {
    nerdletUrlState: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      entityGuid: null,
      entityData: null,
      containerMetrics: {
        MaxCpuSysPerc: 0,
        MaxMemPerc: 0,
        MaxMemResidentBytes: 0,
        MaxUniqueDailyContainers: 0
      },
      hostMetrics: {
        uniqueDailyHosts: 0,
        Hosts: 0,
        MaxCpuPercent: 0,
        MaxMemPerc: 0,
        MaxMemoryBytes: 0,
        MaxTxBytes: 0,
        MaxRxBytes: 0
      },
      systemSamples: [],
      networkSamples: [],
      hosts: [],
      data: [],
      containerIds: [],
      instanceData: [],
      cloudData: {
        amazon: null,
        azure: null,
        google: null
      },
      cloudRegions: {
        amazon: [],
        azure: [],
        google: []
      },
      groupByDefault: 'accountName',
      sortByDefault: 'nonOptimizedCost',
      sorted: [],
      sort: 'desc',
      totals: {
        optimizedCost: 0,
        nonOptimizedCost: 0,
        saving: 0,
        optimizedCount: 0,
        nonOptimizedCount: 0
      },
      hasCloud: false,
      config: {
        optimizeBy: 50,
        groupBy: '',
        sortBy: '',
        sort: 'desc',
        discountMultiplier: 1,
        lastReportPeriod: 24, // 1 day in hours
        staleInstanceCpu: 5,
        staleInstanceMem: 5,
        staleReceiveBytesPerSecond: 0,
        staleTransmitBytesPerSecond: 0,
        rightSizeCpu: 0.5,
        rightSizeMem: 0.5,
        instanceOptionsCurrent: [],
        instanceOptions: [],
        cloudData: {
          amazon: 'us-east-1',
          azure: 'eastus',
          google: 'us-east1'
        }
      }
    };
    this.handleParentState = this.handleParentState.bind(this);
    this.fetchCloudPricing = this.fetchCloudPricing.bind(this);
    this.handleUserConfig = this.handleUserConfig.bind(this);
    this.fetchData = this.fetchData.bind(this);
  }

  async componentDidMount() {
    if (this.props.nerdletUrlState && this.props.nerdletUrlState.entityGuid) {
      await this.setState({
        entityGuid: this.props.nerdletUrlState.entityGuid
      });
      this.fetchData(this.props.nerdletUrlState.entityGuid);
    }
  }

  /* eslint-disable react/no-did-update-set-state */
  // tracking issue https://github.com/newrelic/nr1-cloud-optimize/issues/39
  async componentDidUpdate() {
    if (
      this.props.nerdletUrlState &&
      this.props.nerdletUrlState.entityGuid &&
      this.state.entityGuid !== this.props.nerdletUrlState.entityGuid
    ) {
      this.setState({
        entityGuid: this.props.nerdletUrlState.entityGuid
      });
      this.fetchData(this.props.nerdletUrlState.entityGuid);
    }
  }
  /* eslint-enable */

  /* eslint-disable no-async-promise-executor */
  // tracking issue https://github.com/newrelic/nr1-cloud-optimize/issues/39
  handleParentState(key, val, trigger) {
    return new Promise(async resolve => {
      // store config updates back into nerdStore
      if (key === 'config') writeDocument('cloudOptimizeCfg', 'main', val);

      await this.setState({ [key]: val });
      switch (trigger) {
        case 'groupAndSort':
          this.groupAndSort(null, '', null);
          break;
        case 'groupAndSortRecalc':
          this.groupAndSort(null, 'recalc', null);
          break;
        default:
        //
      }
      resolve();
    });
  }
  /* eslint-enable */

  async fetchData(entityGuid) {
    const result = await nerdGraphQuery(getEntityData(entityGuid));
    const entityData = ((result || {}).actor || {}).entity || {};
    let { config, cloudData, hasCloud } = this.state;
    if (entityData) {
      await this.handleUserConfig();
      await this.setState({ entityData });
      const { hosts, containerIds } = await this.fetchSystemData(entityData);
      if (hosts && hosts.length > 0) {
        await this.setState({ hosts, containerIds });
        const {
          systemSamples,
          networkSamples,
          uniqueDailyHosts
        } = await this.fetchHostPerformance(entityData.account.id, hosts);
        await this.setState({ systemSamples, networkSamples });
        await this.fetchCloudPricing();

        const hostMetrics = {
          uniqueDailyHosts: uniqueDailyHosts,
          Hosts: systemSamples.length,
          MaxCpuPercent: 0,
          MaxMemPerc: 0,
          MaxMemoryBytes: 0,
          MaxTxBytes: 0,
          MaxRxBytes: 0
        };

        let currentHasCloud = false;
        const tempInstanceData = [];
        systemSamples.forEach(sample => {
          const instance = processSample(
            entityData.account,
            sample,
            config,
            networkSamples,
            cloudData
          );
          if (instance.matchedInstance) currentHasCloud = true;
          if (instance) tempInstanceData.push(instance);
          if (instance.maxCpuPercent > hostMetrics.MaxCpuPercent)
            hostMetrics.MaxCpuPercent = instance.maxCpuPercent;
          if (instance.maxMemoryPercent > hostMetrics.MaxMemPerc)
            hostMetrics.MaxMemPerc = instance.maxMemoryPercent;
          if (instance.maxMemoryUsedBytes > hostMetrics.MaxMemoryBytes)
            hostMetrics.MaxMemoryBytes = instance.maxMemoryUsedBytes;
          if (instance.transmitBytesPerSecond > hostMetrics.MaxTxBytes)
            hostMetrics.MaxTxBytes = instance.transmitBytesPerSecond;
          if (instance.receiveBytesPerSecond > hostMetrics.MaxRxBytes)
            hostMetrics.MaxRxBytes = instance.receiveBytesPerSecond;
        });
        hasCloud = currentHasCloud;

        await this.setState({
          instanceData: tempInstanceData,
          hostMetrics,
          hasCloud
        });
        this.groupAndSort(tempInstanceData, '', '');
      }
      if (containerIds && containerIds.length > 0) {
        const containerMetrics = await this.fetchContainerPerformanceData(
          entityData.account.id,
          entityData.applicationId
        );
        this.setState({ containerMetrics });
      }
    }
    this.setState({ loading: false });
  }

  /* eslint-disable no-async-promise-executor */
  // tracking issue https://github.com/newrelic/nr1-cloud-optimize/issues/39
  async fetchContainerPerformanceData(accountId, appId) {
    return new Promise(async resolve => {
      const ngResult = await nerdGraphQuery(
        getContainerPerformance(accountId, appId)
      );
      const result =
        ((((ngResult || {}).actor || {}).account || {}).container || {})
          .results || [];
      const uniques =
        ((((ngResult || {}).actor || {}).account || {}).uniqueContainers || {})
          .results || [];
      let MaxUniqueDailyContainers = 0;
      uniques.forEach(day => {
        if (day['uniqueCount.containerId'] > MaxUniqueDailyContainers)
          MaxUniqueDailyContainers = day['uniqueCount.containerId'];
      });
      result[0].MaxUniqueDailyContainers = MaxUniqueDailyContainers;
      resolve(result[0]);
    });
  }
  /* eslint-enable */

  async fetchSystemData(entityData) {
    return new Promise(resolve => {
      const hostPromises = entityData.nrdbQuery.results.map(result =>
        nerdGraphQuery(
          getInfraHost(
            entityData.account.id,
            result.facet[0],
            result.facet[1],
            entityData.applicationId
          )
        )
      );
      let hosts = [];
      let containerIds = [];
      Promise.all(hostPromises).then(values => {
        values.forEach(value => {
          const systemHost =
            ((((value || {}).actor || {}).account || {}).system || {})
              .results || [];
          const processHost =
            ((((value || {}).actor || {}).account || {}).container || {})
              .results || [];
          if (systemHost[0]) {
            hosts.push(systemHost[0].hostname);
            processHost.forEach(item => {
              containerIds.push(item.containerId);
            });
          } else if (processHost[0]) {
            processHost.forEach(item => {
              containerIds.push(item.containerId);
            });
            hosts.push(processHost[0].hostname);
          }
        });
        hosts = [...new Set(hosts)];
        containerIds = [...new Set(containerIds)];
        resolve({ hosts, containerIds });
      });
    });
  }

  /* eslint-disable no-async-promise-executor */
  // tracking issue https://github.com/newrelic/nr1-cloud-optimize/issues/39
  async fetchHostPerformance(accountId, hosts) {
    return new Promise(async resolve => {
      const results = await nerdGraphQuery(
        getInstanceData(accountId, `'${hosts.join("','")}'`)
      );
      const systemSamples =
        ((((results || {}).actor || {}).account || {}).system || {}).results ||
        [];
      const networkSamples =
        ((((results || {}).actor || {}).account || {}).network || {}).results ||
        [];
      const uniqueHostsResult =
        ((((results || {}).actor || {}).account || {}).uniqueHosts || {})
          .results || [];
      let uniqueDailyHosts = 0;
      uniqueHostsResult.forEach(day => {
        if (day['uniqueCount.hostname'] > uniqueDailyHosts)
          uniqueDailyHosts = day['uniqueCount.hostname'];
      });
      resolve({ systemSamples, networkSamples, uniqueDailyHosts });
    });
  }
  /* eslint-enable */

  handleUserConfig() {
    return new Promise(resolve => {
      // console.log("fetching user config from nerdstorage")
      getDocument('cloudOptimizeCfg', 'main').then(async data => {
        const currentConfig = data;
        const { config } = this.state; // defaultConfig
        if (currentConfig) {
          // needed for backwards compatibility before multicloud support
          if (!currentConfig.cloudData) {
            // console.log("cloudData was not available in config, injecting defaults")
            currentConfig.cloudData = { ...config.cloudData };
          }
          this.setState({ config: currentConfig }, () => {
            writeDocument('cloudOptimizeCfg', 'main', currentConfig);
          });
        } else {
          // console.log("writing default config")
          writeDocument('cloudOptimizeCfg', 'main', config);
        }
        resolve();
      });
    });
  }

  fetchCloudPricing(cfg) {
    let { config, cloudData, cloudRegions } = this.state;
    if (cfg) {
      config = { ...cfg };
    }

    return new Promise(resolve => {
      const cloudPromises = Object.keys(config.cloudData).map(cloud => {
        return new Promise(resolve => {
          fetch(
            `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/${cloud}/regions.json`
          )
            .then(response => {
              return response.json();
            })
            .then(myJson => {
              cloudRegions[cloud] = myJson;
            });

          fetch(
            `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/${cloud}/compute/pricing/${config.cloudData[cloud]}.json`
          )
            .then(response => {
              return response.json();
            })
            .then(myJson => {
              myJson.cloud = cloud;
              resolve(myJson);
            });
        });
      });

      Promise.all(cloudPromises).then(async results => {
        results.forEach(result => {
          cloudData[result.cloud] = result.products;
        });
        await this.setState({ cloudData, cloudRegions });
        resolve();
      });
    });
  }

  groupAndSort(data, type, val) {
    const { config, sortByDefault, sort } = this.state;
    const sortBy =
      (type === 'sortBy' ? val : null) || config.sortBy || sortByDefault;
    const { totals, grouped, tempData } = groupInstances(
      data,
      type,
      val,
      this.state,
      true
    );
    const finalSort =
      sort === 'asc'
        ? _.sortBy(grouped, sortBy)
        : _.sortBy(grouped, sortBy).reverse();
    this.setState({
      sorted: finalSort,
      totals: totals,
      data: tempData
    });
  }

  render() {
    const {
      entityData,
      hosts,
      containerIds,
      totals,
      hostMetrics,
      containerMetrics,
      sorted,
      hasCloud,
      config,
      cloudRegions,
      loading
    } = this.state;

    return (
      <AutoSizer>
        {({ height }) => (
          <div>
            <MenuBar
              handleParentState={this.handleParentState}
              config={config}
              cloudRegions={cloudRegions}
              fetchCloudPricing={this.fetchCloudPricing}
              totals={totals}
            />

            <Segment
              style={{
                minHeight: height - 75,
                padding: '0px',
                backgroundColor: '#f7f7f8',
                border: '0px'
              }}
            >
              <Dimmer active={loading}>
                <Loader style={{ top: '150px' }} size="big">
                  Loading
                </Loader>
              </Dimmer>

              <Grid
                relaxed
                stretched
                columns="equal"
                style={{ padding: '3px', margin: '0px' }}
              >
                <MainCharts
                  entityData={entityData}
                  hosts={hosts}
                  containerIds={containerIds}
                />

                {hostMetrics.Hosts > 0 ? (
                  <HostMetrics hostMetrics={hostMetrics} />
                ) : (
                  ''
                )}

                {containerIds.length > 0 ? (
                  <ContainerOptimization
                    containerMetrics={containerMetrics}
                    containerIds={containerIds}
                  />
                ) : (
                  ''
                )}

                <OptimizationCandidates sorted={sorted} hasCloud={hasCloud} />
              </Grid>
            </Segment>
          </div>
        )}
      </AutoSizer>
    );
  }
}
