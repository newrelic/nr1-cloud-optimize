/* eslint-disable react/no-did-update-set-state */
/* eslint-disable prettier/prettier */
import React from 'react';
import PropTypes from 'prop-types';

import { nerdGraphQuery, getEntityData, getInfraHost, getInstanceData, getContainerPerformance } from './utils';
import { processSample } from '../shared/lib/processor';
import MainCharts from './components/main-charts';
import ContainerOptimization from './components/container-optimization';
import HostMetrics from './components/host-metrics';

export default class CloudOptimizeApm extends React.Component {    
    static propTypes = {
      nerdletUrlState: PropTypes.shape({
        entityGuid: PropTypes.string
      }),
      userConfig: PropTypes.object,
      groupInstances: PropTypes.func
    }

    constructor(props){
        super(props)
        this.state = {
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
            hasCloud: false
        }
        
        this.fetchData = this.fetchData.bind(this)
    }

    componentDidMount(){
        if(this.props.nerdletUrlState && this.props.nerdletUrlState.entityGuid){
            this.setState({ entityGuid: this.props.nerdletUrlState.entityGuid }, this.fetchData)
        }
    }

    componentDidUpdate(){
        if(this.props.nerdletUrlState && this.props.nerdletUrlState.entityGuid && this.state.entityGuid != this.props.nerdletUrlState.entityGuid){
            this.setState({ entityGuid: this.props.nerdletUrlState.entityGuid }, this.fetchData)
        }
    }

    async fetchData(){
        const { entityGuid } = this.state;
        const result = await nerdGraphQuery(getEntityData(entityGuid))
        const entityData = ((result || {}).actor || {}).entity || false

        if(entityData){
            await this.setState({entityData})
            const { hosts, containerIds } = await this.fetchSystemData(entityData)
            
            // Hosts
            if(hosts && hosts.length > 0){
                const { systemSamples, networkSamples, uniqueDailyHosts } = await this.fetchHostPerformance(entityData.account.id, hosts)
                await this.setState({ hosts, containerIds, systemSamples, networkSamples})

                const { instanceData, hostMetrics, hasCloud } = this.calculateHostMetricsAndInstanceData({ systemSamples, uniqueDailyHosts });
                await this.setState({ instanceData, hostMetrics })

                this.props.toggleHasCloud({ hasCloud })
                this.props.groupInstances({ data: instanceData, type: "", val: "" })
            }

            // Containers
            if(containerIds && containerIds.length > 0){
                const containerMetrics = await this.fetchContainerPerformanceData(entityData.account.id, entityData.applicationId)
                await this.setState({ containerMetrics })
            }
        }

        this.props.toggleLoading({ loading: false });
    }

    async fetchContainerPerformanceData(accountId, appId){
        return new Promise(async (resolve)=>{
            const ngResult = await nerdGraphQuery(getContainerPerformance(accountId, appId))
            const result = ((((ngResult || {}).actor || {}).account || {}).container || {}).results || []
            const uniques = ((((ngResult || {}).actor || {}).account || {}).uniqueContainers || {}).results || []
            let MaxUniqueDailyContainers = 0
            uniques.forEach((day)=>{
                if(day["uniqueCount.containerId"] > MaxUniqueDailyContainers) MaxUniqueDailyContainers = day["uniqueCount.containerId"]
            })
            result[0].MaxUniqueDailyContainers = MaxUniqueDailyContainers
            resolve(result[0])
        });
    }

    async fetchSystemData(entityData){
        return new Promise((resolve)=>{
            const hostPromises = entityData.nrdbQuery.results.map((result) =>
                nerdGraphQuery(getInfraHost(entityData.account.id, result.facet[0], result.facet[1], entityData.applicationId))
            )

            let hosts = []
            let containerIds = []
            Promise.all(hostPromises).then((values)=>{
                values.forEach((value)=>{
                    const systemHost = ((((value || {}).actor || {}).account || {}).system || {}).results || []
                    const processHost = ((((value || {}).actor || {}).account || {}).container || {}).results || []
                    if(systemHost[0]){
                        hosts.push(systemHost[0].hostname)
                        processHost.forEach((item)=>{
                            containerIds.push(item.containerId)
                        })
                    }else if(processHost[0]){
                            processHost.forEach((item)=>{
                                containerIds.push(item.containerId)
                            })
                            hosts.push(processHost[0].hostname)
                        }
                })
                hosts = [... new Set(hosts)]
                containerIds = [... new Set(containerIds)]
                resolve({hosts, containerIds})
            });
        });
    }

    async fetchHostPerformance(accountId, hosts){
        return new Promise(async (resolve)=>{
            const results = await nerdGraphQuery(getInstanceData(accountId,  `'${  hosts.join("','")  }'`))
            const systemSamples = ((((results || {}).actor || {}).account || {}).system || {}).results || []
            const networkSamples = ((((results || {}).actor || {}).account || {}).network || {}).results || []
            const uniqueHostsResult = ((((results || {}).actor || {}).account || {}).uniqueHosts || {}).results || []
            let uniqueDailyHosts = 0
            uniqueHostsResult.forEach((day)=>{
                if(day["uniqueCount.hostname"]>uniqueDailyHosts) uniqueDailyHosts = day["uniqueCount.hostname"]
            })
            resolve({systemSamples, networkSamples, uniqueDailyHosts})
        });
    }

    calculateHostMetricsAndInstanceData ({ systemSamples, uniqueDailyHosts }) {
      const { userConfig, cloudData } = this.props;

      const hostMetrics = {
          uniqueDailyHosts: uniqueDailyHosts,
          Hosts: systemSamples.length,
          MaxCpuPercent: 0,
          MaxMemPerc: 0,
          MaxMemoryBytes: 0,
          MaxTxBytes: 0,
          MaxRxBytes: 0
      }

      let currentHasCloud = false
      const instanceData = []
      systemSamples.forEach((sample)=>{
          const instance = processSample(entityData.account, sample, userConfig, networkSamples, cloudData)
          if(instance.matchedInstance) currentHasCloud = true
          if(instance) instanceData.push(instance)
          if(instance.maxCpuPercent > hostMetrics.MaxCpuPercent) hostMetrics.MaxCpuPercent = instance.maxCpuPercent
          if(instance.maxMemoryPercent > hostMetrics.MaxMemPerc) hostMetrics.MaxMemPerc = instance.maxMemoryPercent
          if(instance.maxMemoryUsedBytes > hostMetrics.MaxMemoryBytes) hostMetrics.MaxMemoryBytes = instance.maxMemoryUsedBytes
          if(instance.transmitBytesPerSecond > hostMetrics.MaxTxBytes) hostMetrics.MaxTxBytes = instance.transmitBytesPerSecond
          if(instance.receiveBytesPerSecond > hostMetrics.MaxRxBytes) hostMetrics.MaxRxBytes = instance.receiveBytesPerSecond
      })

      return { instanceData, hostMetrics, hasCloud: currentHasCloud }
    }

    render() {
        const { entityData, hosts, containerIds, hostMetrics, containerMetrics } = this.state

        return (
            <>
                <MainCharts 
                    entityData={entityData}
                    hosts={hosts}
                    containerIds={containerIds}
                />

                { hostMetrics.Hosts > 0 ? <HostMetrics hostMetrics={hostMetrics} /> : "" }

                { containerIds.length > 0 ?  <ContainerOptimization containerMetrics={containerMetrics} containerIds={containerIds} /> : "" }
            </>  
        )
    }
}
