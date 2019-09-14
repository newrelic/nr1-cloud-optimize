import React from 'react';
import { NerdGraphQuery } from 'nr1';
import { getCollection, writeDocument, accountsQuery, getInstanceData } from './utils';
import MenuBar from './components/menuBar'
import HeaderCosts from './components/headerCosts'
import AccountCards from './components/accountCards'
import _ from 'lodash'
const helper = require('./helpers')

export default class CloudOptimize extends React.Component {
    constructor(props){
        super(props)
        this.state = { 
            enableNerdLog:false, 
            loading: null,
            completedAccounts: 0,
            accounts: [],
            instanceData: [],
            snapshots: [],
            awsPricing: null,
            awsPricingRegionDefault: "us-east-1",
            groupByDefault: "accountName",
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
                groupBy: "", sortBy: "", awsPricingRegion: "", sort: "desc",
                discountMultiplier: 1, lastReportPeriod: 24, // 1 day in hours
                staleInstanceCpu: 5, staleInstanceMem: 5,
                staleReceiveBytesPerSecond: 0, staleTransmitBytesPerSecond: 0,
                rightSizeCpu: 0.5, rightSizeMem: 0.5,
                instanceOptionsCurrent: [], instanceOptions: []
            }
        }
        this.handleParentState = this.handleParentState.bind(this)
        this.fetchSnapshots = this.fetchSnapshots.bind(this)
        this.fetchAwsPricing = this.fetchAwsPricing.bind(this)
    }

    nerdLog(msg){
        if(this.state.enableNerdLog){ 
            /*eslint no-console: ["error", { allow: ["warn", "error"] }] */
            console.warn(msg); 
        }
    }

    handleParentState(key,val,trigger){
        // store config updates back into nerdStore
        if(key == "config"){
            writeDocument("cloudOptimizeCfg", "main", val)
        }
        this.setState({[key]:val})
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
    }

    async componentDidMount(){
        this.fetchNewRelicData()
    }

    async fetchSnapshots(){
        let snapshots = await getCollection("cloudOptimizeSnapshots")
        this.setState({snapshots: snapshots.reverse()})
    }

    async handleUserConfig(){
        this.nerdLog("fetching newrelic user config from nerdstore")
        let configs = await getCollection("cloudOptimizeCfg")
        if(configs.length === 1 && configs[0].id == "main"){ // set existing config
            this.nerdLog("loading existing config")
            this.setState({config: configs[0].document}) 
        }else{ // write in default config
            this.nerdLog("writing default config")
            await writeDocument("cloudOptimizeCfg", "main", this.state.config)
        }
    }

    async fetchAccounts(){
        this.nerdLog("fetching newrelic accounts")
        let results = await NerdGraphQuery.query({query: accountsQuery})
        let accounts = (((results || {}).data || {}).actor || {}).accounts || []
        this.setState({accounts: accounts})
        return accounts
    }

    async fetchNewRelicData(){
        this.setState({loading:true})
        this.handleUserConfig()
        let accounts = await this.fetchAccounts()
        if(accounts.length > 0){
            await this.fetchAwsPricing(this.state.awsPricingRegionDefault)
            this.fetchSamples(accounts)
        }
        this.fetchSnapshots()
        this.setState({loading:false})
    }

    fetchSamples(accounts){
        let tempInstanceData = []
        let { config, awsPricing, completedAccounts } = this.state
        accounts.forEach(async (account)=>{
            let results = await NerdGraphQuery.query({query: getInstanceData(account.id)})
            if(results.errors){
                this.nerdLog(results.errors)
            }else{
                let systemSamples = (((((results || {}).data || {}).actor || {}).account || {}).system || {}).results || []
                let networkSamples = (((((results || {}).data || {}).actor || {}).account || {}).network || {}).results || []

                systemSamples.forEach((sample,i)=>{
                    systemSamples[i].timeSinceLastReported = new Date().getTime() - systemSamples[i].timestamp
                    // console.log(systemSamples[i].timeSinceLastReported)
                    // console.log(sample.timeSinceLastReported)
                    systemSamples[i].hostname = sample.facet[0]
                    systemSamples[i].apmApplicationNames = sample.facet[1]
                    systemSamples[i].entityGuid = sample.facet[2]
                    systemSamples[i].awsRegion = sample.facet[3]
                    systemSamples[i].apps = sample.facet[1] ? sample.facet[1].split("|").filter(Boolean) : []
                    systemSamples[i].memGB = Math.round(sample.memTotalBytes/1024/1024/1024)
                    systemSamples[i].numCpu = parseFloat(sample.numCpu)
                    systemSamples[i].awsInstanceType = sample.ec2InstanceType
                    systemSamples[i].receiveBytesPerSecond = 0
                    systemSamples[i].transmitBytesPerSecond = 0

                    for(let z=0;z<networkSamples.length;z++){
                        if(systemSamples[i].entityGuid == networkSamples[z].facet[1]){
                            systemSamples[i].receiveBytesPerSecond = networkSamples[z].receiveBytesPerSecond
                            systemSamples[i].transmitBytesPerSecond = networkSamples[z].transmitBytesPerSecond
                            break
                        }
                    }

                    systemSamples[i].awsPrice1 = this.pluckAwsPrice(sample.ec2InstanceType || sample.instanceType, sample.operatingSystem) * config.discountMultiplier
                    systemSamples[i].suggestions = helper.determineAwsInstance(config, awsPricing, systemSamples[i])

                    if(systemSamples[i].suggestions){
                        let optimizedSuggestion = systemSamples[i].suggestions.suggested
                        systemSamples[i].suggestedInstanceType = optimizedSuggestion.instanceType
                        systemSamples[i].awsPrice2 = parseFloat(optimizedSuggestion.price) * config.discountMultiplier
                        systemSamples[i].saving = systemSamples[i].awsPrice1 - systemSamples[i].awsPrice2
                    }

                    systemSamples[i].accountId = account.id
                    systemSamples[i].accountName = account.name
                    tempInstanceData.push(systemSamples[i])
                })

                await this.setState({"instanceData": tempInstanceData})
                this.groupAndSort(tempInstanceData, "", "")
            }
            completedAccounts = completedAccounts + 1
            await this.setState({completedAccounts})
        }) 
    }

    groupAndSort(data, type, val){
        let tempData = data || this.state.instanceData
        let cfg = this.state.config
        let groupBy = (type == "groupBy" ? val : null) || cfg.groupBy || this.state.groupByDefault
        let sortBy = (type == "sortBy" ? val : null) || cfg.sortBy || this.state.sortByDefault

        if(type == "awsPricingRegion" || type == "recalc"){
            tempData.forEach((sample,i)=>{
                tempData[i].awsPrice1 = this.pluckAwsPrice(sample.ec2InstanceType || sample.instanceType, sample.operatingSystem) * cfg.discountMultiplier
                tempData[i].suggestions = helper.determineAwsInstance(this.state.config, this.state.awsPricing, tempData[i])
                if(tempData[i].suggestions){
                    let optimizedSuggestion = tempData[i].suggestions.suggested
                    tempData[i].suggestedInstanceType = optimizedSuggestion.instanceType
                    tempData[i].awsPrice2 = parseFloat(optimizedSuggestion.price) * cfg.discountMultiplier
                    tempData[i].saving = tempData[i].awsPrice1 - tempData[i].awsPrice2
                }else{
                    tempData[i].awsPrice2 = 0
                    tempData[i].saving = 0
                }
            })
        }

        let totals = {
            optimizedCost: 0,
            nonOptimizedCost: 0,
            saving: 0,
            optimizedCount: 0,
            nonOptimizedCount: 0
        }

        let grouped = _(tempData)
            .groupBy(x => x[groupBy])
            .map((value, key) => { 
                let summary = {
                    optimizedCost: 0,
                    nonOptimizedCost: 0,
                    saving: 0,
                    optimizedCount: 0,
                    nonOptimizedCount: 0,
                    totalInstances: value.length
                }

                value.forEach((instance)=>{
                    if(instance.saving > 0 && instance.instanceType == "stale"){
                        summary.optimizedCost += instance.awsPrice2
                        summary.nonOptimizedCost += instance.awsPrice1
                        summary.saving += instance.saving
                        summary.nonOptimizedCount++

                        totals.optimizedCost += instance.awsPrice2
                        totals.nonOptimizedCost += instance.awsPrice1
                        totals.saving += instance.saving
                        totals.nonOptimizedCount++
                    }else if(instance.saving > 0 && (instance.maxCpuPercent <  cfg.optimizeBy || instance.maxMemoryPercent <  cfg.optimizeBy)){
                        summary.optimizedCost += instance.awsPrice2
                        summary.nonOptimizedCost += instance.awsPrice1
                        summary.saving += instance.saving
                        summary.nonOptimizedCount++

                        totals.optimizedCost += instance.awsPrice2
                        totals.nonOptimizedCost += instance.awsPrice1
                        totals.saving += instance.saving
                        totals.nonOptimizedCount++

                        if(instance.maxCpuPercent < cfg.optimizeBy && instance.maxMemoryPercent < cfg.optimizeBy){
                            instance.suggestion = "CPU & Memory Optimize"
                        }else if(instance.maxCpuPercent < cfg.optimizeBy){
                            instance.suggestion = "Memory Optimize"
                        }else if(instance.maxMemoryPercent < cfg.optimizeBy){
                            instance.suggestion = "CPU Optimize"
                        }
                    }else{
                        summary.optimizedCount++
                        totals.optimizedCount++
                    }

                })
                return (
                    {group: key, instances: value, ...summary}) 
                })
            .value();

        let finalSort = this.state.sort == "asc" ? _.sortBy(grouped, sortBy) : _.sortBy(grouped, sortBy).reverse()     
        this.setState({
            sorted: finalSort,
            totals: totals,
            data: tempData
        })
    }

    pluckAwsPrice(instanceType, operatingSystem){
        for(var i=0;i<this.state.awsPricing.prices.length;i++){
            if( this.state.awsPricing.prices[i].attributes["aws:ec2:preInstalledSw"] == "NA" &&
                this.state.awsPricing.prices[i].attributes["aws:ec2:instanceType"] == instanceType &&
                this.state.awsPricing.prices[i].attributes["aws:ec2:operatingSystem"].toLowerCase() == operatingSystem.toLowerCase()
            ){
                return parseFloat(this.state.awsPricing.prices[i].price.USD)
            }
        }
        this.nerdLog(`unable to get aws price for ${instanceType} : ${operatingSystem}`)
        return 0
    }

    fetchAwsPricing(region){
        return new Promise((resolve)=>{
            this.nerdLog(`fetching aws ec2 pricing: ${region}`)
            // https://cors.io/?https://a0.p.awsstatic.com/pricing/1.0/ec2/region/${project.awsRegion}/ondemand/linux/index.json
            // cors hack
            fetch(`https://yzl85kz129.execute-api.us-east-1.amazonaws.com/dev?url=https://a0.p.awsstatic.com/pricing/1.0/ec2/region/${region}/ondemand/linux/index.json`).then((response)=> {
                return response.json()
            }).then((myJson)=>{
                this.setState({awsPricing: myJson})
                resolve()
            });
        });
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
                        instanceLength={this.state.sorted.length} 
                        fetchAwsPricing={this.fetchAwsPricing} 
                        fetchSnapshots={this.fetchSnapshots}
                        snapshots={this.state.snapshots}
                    />
                    <AccountCards 
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
