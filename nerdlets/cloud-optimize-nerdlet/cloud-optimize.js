import React from 'react';
import { NerdGraphQuery } from 'nr1';
import { getCollection, writeDocument, accountsQuery, getInstanceData, accountsWithData } from './utils';
import { processSample, groupInstances } from './processor';
import MenuBar from './components/menuBar'
import HeaderCosts from './components/headerCosts'
import AccountCards from './components/accountCards'
import _ from 'lodash'

export default class CloudOptimize extends React.Component {
    constructor(props){
        super(props)
        this.state = { 
            loading: null,
            completedAccounts: 0,
            accounts: [],
            instanceData: [],
            snapshots: [],
            awsPricing: null,
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
                groupBy: "", sortBy: "", awsPricingRegion: "us-east-1", sort: "desc",
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

    handleParentState(key,val,trigger){
        // store config updates back into nerdStore
        if(key == "config") writeDocument("cloudOptimizeCfg", "main", val)
        
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

    async fetchNewRelicData(){
        this.setState({loading: true})
        await this.handleUserConfig()
        await this.fetchAccounts()
        if(this.state.accounts.length > 0) await this.fetchAwsPricing(this.state.config.awsPricingRegion)
        this.fetchSamples(this.state.accounts)
        this.fetchSnapshots()
        this.setState({loading: false})
    }

    handleUserConfig(){
        return new Promise(async (resolve) => {
            console.log("fetching newrelic user config from nerdstore")
            let configs = await getCollection("cloudOptimizeCfg")
            if(configs.length === 1 && configs[0].id == "main"){ // set existing config
                console.log("loading existing config")
                await this.setState({config: configs[0].document}) 
            }else{ // write in default config
                console.log("writing default config")
                await writeDocument("cloudOptimizeCfg", "main", this.state.config)
            }
            resolve()
        });
    }

    async fetchAccounts(){
        console.log("fetching newrelic accounts")
        await this.setState({accounts: await accountsWithData("SystemSample")})
    }

    async fetchSnapshots(){
        let snapshots = await getCollection("cloudOptimizeSnapshots")
        this.setState({snapshots: snapshots.reverse()})
    }

    fetchSamples(accounts){
        let tempInstanceData = []
        let { config, awsPricing, completedAccounts } = this.state
        accounts.forEach(async (account)=>{
            let results = await NerdGraphQuery.query({query: getInstanceData(account.id)})
            if(results.errors){
                console.log(results.errors)
            }else{
                let systemSamples = (((((results || {}).data || {}).actor || {}).account || {}).system || {}).results || []
                let networkSamples = (((((results || {}).data || {}).actor || {}).account || {}).network || {}).results || []
                systemSamples.forEach((sample)=>{
                    tempInstanceData.push(processSample(account, sample, config, networkSamples, awsPricing))
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

    fetchAwsPricing(region){
        return new Promise((resolve)=>{
            console.log(`fetching aws ec2 pricing: ${region}`)
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
