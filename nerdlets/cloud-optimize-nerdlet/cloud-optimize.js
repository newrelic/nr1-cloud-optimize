import React from 'react';
import { NerdGraphQuery, NrqlQuery } from 'nr1';
import { getDocument, getCollection, writeDocument, getInstanceData, accountsWithData, getSystemSampleKeySetNRQL, isCloudLabel } from '../shared/lib/utils';
import { processSample, groupInstances } from '../shared/lib/processor';
import MenuBar from './components/menuBar'
import HeaderCosts from './components/headerCosts'
import AccountCards from './components/accountCards'
import _ from 'lodash'

export default class CloudOptimize extends React.Component {
    constructor(props){
        super(props)
        this.state = { 
            loading: true,
            completedAccounts: 0,
            accounts: [],
            instanceData: [],
            snapshots: [],
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
            groupByDefault: "accountName",
            cloudLabelGroups: [],
            sortByDefault: "nonOptimizedCost",
            sorted: [], sort: "desc",
            totals: {
                optimizedCost: 0,
                nonOptimizedCost: 0,
                saving: 0,
                optimizedCount: 0,
                nonOptimizedCount: 0
            },
            config: {
                optimizeBy: 50,
                groupBy: "", groupByLabel: "", sortBy: "", sort: "desc",
                discountMultiplier: 1, lastReportPeriod: 24, // 1 day in hours
                staleInstanceCpu: 5, staleInstanceMem: 5,
                staleReceiveBytesPerSecond: 0, staleTransmitBytesPerSecond: 0,
                rightSizeCpu: 0.5, rightSizeMem: 0.5,
                instanceOptionsCurrent: [], instanceOptions: [],
                cloudData: {
                    amazon: "us-east-1",
                    azure: "eastus",
                    google: "us-east1"
                }
            }
        }
        this.handleParentState = this.handleParentState.bind(this)
        this.fetchSnapshots = this.fetchSnapshots.bind(this)
        this.fetchCloudPricing = this.fetchCloudPricing.bind(this)
        this.handleUserConfig = this.handleUserConfig.bind(this)
    }

    handleParentState(key,val,trigger){
        return new Promise(async (resolve) => {
            // store config updates back into nerdStore
            if(key == "config") writeDocument("cloudOptimizeCfg", "main", val)
            
            await this.setState({[key]:val})
            switch(trigger) {
                case "groupAndSort":
                    this.groupAndSort(null,"",null)
                    break;
                case "groupAndSortRecalc":
                    this.groupAndSort(null,"recalc",null)
                    break
                default:
                // 
            }
          resolve()
        });
    }

    async componentDidMount(){
        this.fetchNewRelicData()
    }

    async fetchNewRelicData(){
        this.setState({loading: true})
        await this.handleUserConfig()
        await this.fetchAccounts()
        await this.fetchCloudPricing()
        this.fetchSamples(this.state.accounts)
        this.fetchSnapshots()
        this.setState({loading: false})
    }

    handleUserConfig(){
        return new Promise((resolve) => {
            //console.log("fetching user config from nerdstorage")
            getDocument("cloudOptimizeCfg", "main").then(async (data)=>{
                let currentConfig = data
                let { config } = this.state // defaultConfig
                if(currentConfig){
                    // needed for backwards compatibility before multicloud support
                    if(!currentConfig.cloudData){
                        //console.log("cloudData was not available in config, injecting defaults")
                        currentConfig.cloudData = Object.assign({}, config.cloudData)
                    }
                    await this.setState({config: currentConfig}) 
                    await writeDocument("cloudOptimizeCfg", "main", currentConfig)
                }else{
                    //console.log("writing default config")
                    await writeDocument("cloudOptimizeCfg", "main", config)
                }
                resolve()
            })
        });
    }

    async fetchAccounts(){
        //console.log("fetching newrelic accounts")
        await this.setState({accounts: await accountsWithData("SystemSample")})
    }

    async fetchSnapshots(){
        let snapshots = await getCollection("cloudOptimizeSnapshots")
        this.setState({snapshots: snapshots.reverse()})
    }

    fetchSamples(accounts){
        let tempInstanceData = []
        let { config, completedAccounts, cloudData } = this.state
        accounts.forEach(async (account)=>{
            let systemSampleKeySetResults = await NrqlQuery.query({accountId: account.id, query: getSystemSampleKeySetNRQL, formatType: NrqlQuery.FORMAT_TYPE.RAW});
            let labelAttributes = systemSampleKeySetResults.data.raw.results[0].allKeys.filter(isCloudLabel);
            let newGroups = new Set(this.state.cloudLabelGroups);
            labelAttributes.forEach((att) => newGroups.add(att));
            await this.setState({cloudLabelGroups: Array.from(newGroups)});
            let results = await NerdGraphQuery.query({query: getInstanceData(account.id, labelAttributes)});
            if(results.errors){
                console.log("get instance data error", results.errors)
            }else{
                let systemSamples = (((((results || {}).data || {}).actor || {}).account || {}).system || {}).results || []
                let networkSamples = (((((results || {}).data || {}).actor || {}).account || {}).network || {}).results || []
                systemSamples.forEach((sample)=>{
                    let instance = processSample(account, sample, config, networkSamples, cloudData)
                    if(instance) tempInstanceData.push(instance)
                })
                await this.setState({"instanceData": tempInstanceData})
                this.groupAndSort(tempInstanceData, "", "")
            }
            completedAccounts = completedAccounts + 1
            await this.setState({completedAccounts})
        })
    }

    groupAndSort(data, type, val){
        let sortBy = (type == "sortBy" ? val : null) || this.state.config.sortBy || this.state.sortByDefault
        let { totals, grouped, tempData } = groupInstances(data, type, val, this.state)
        let finalSort = this.state.sort == "asc" ? _.sortBy(grouped, sortBy) : _.sortBy(grouped, sortBy).reverse()     
        this.setState({
            sorted: finalSort,
            totals: totals,
            data: tempData
        })
    }

    fetchCloudPricing(cfg){
        let { config, cloudData, cloudRegions } = this.state
        if(cfg){
            config = Object.assign({},cfg)
        }

        return new Promise((resolve)=>{
            let cloudPromises = Object.keys(config.cloudData).map((cloud)=>{
                return new Promise((resolve)=>{
                    fetch(`https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/${cloud}/regions.json`).then((response) => {
                        return response.json()
                    }).then((myJson)=>{
                        cloudRegions[cloud] = myJson
                    });

                    fetch(`https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/${cloud}/compute/pricing/${config.cloudData[cloud]}.json`).then((response) => {
                        return response.json()
                    }).then((myJson)=>{
                        myJson.cloud = cloud
                        resolve(myJson)
                    });
                });
            })

            Promise.all(cloudPromises).then(async (results)=>{
                results.forEach((result) => { cloudData[result.cloud] = result.products })
                await this.setState({cloudData, cloudRegions})
                resolve()
            });
        })
    }

    render() {
        return (
            <div>
                <div className="main main-light">
                    <HeaderCosts 
                        title="YEARLY " 
                        multiplier={720 * 12} 
                        totals={this.state.totals} 
                        completedAccounts={this.state.completedAccounts} 
                        instances={this.state.instanceData.length}
                    />
                    <MenuBar 
                        handleParentState={this.handleParentState} 
                        config={this.state.config} 
                        cloudRegions={this.state.cloudRegions} 
                        fetchCloudPricing={this.fetchCloudPricing}
                        instanceLength={this.state.sorted.length} 
                        fetchSnapshots={this.fetchSnapshots}
                        snapshots={this.state.snapshots}
                        cloudLabelGroups={this.state.cloudLabelGroups}
                    />
                    <AccountCards 
                        loading={this.state.loading}
                        config={this.state.config} 
                        sorted={this.state.sorted} 
                        groupByDefault={this.state.groupByDefault} 
                        handleParentState={this.handleParentState} 
                        fetchSnapshots={this.fetchSnapshots}
                        snapshots={this.state.snapshots}
                        height={this.props.height}
                        accounts={this.state.accounts.length} 
                        completedAccounts={this.state.completedAccounts}
                        instances={this.state.instanceData.length}
                    />
                </div>
            </div>
        )
    }
}
