import React from 'react'
import { Menu, Dropdown } from 'semantic-ui-react'
import Configuration from './config'
import SnapshotList from './snapshots/snapshotList'
const awsRegions = require('../awsRegions.json')

export default class MenuBar extends React.Component {

    constructor(props){
        super(props)
        this.handleOptimize = this.handleOptimize.bind(this)
        this.handleDropdownChange = this.handleDropdownChange.bind(this)
    }

    handleDropdownChange(event, data, type){
        let tempConfig = this.props.config
        tempConfig[type] = data.value
        if(type == "awsPricingRegion"){
            this.props.handleParentState("config",tempConfig,"groupAndSortRecalc")
        }else{
            this.props.handleParentState("config",tempConfig,"groupAndSort")
        }
    }

    handleOptimize(e){
        let tempConfig = this.props.config
        tempConfig["optimizeBy"] = e.target.value
        this.props.handleParentState("config",tempConfig,"groupAndSort")
    }

    render() {
        const groupOptions = [
            { key: 1, text: 'NR Account', value: 'accountName' },
            { key: 2, text: 'Cloud Account', value: 'providerAccountName' },
            { key: 3, text: 'Applications', value: 'apmApplicationNames' },
            { key: 4, text: 'AWS Instance Type', value: 'awsInstanceType' },
            { key: 5, text: 'Suggested Instance Type', value: 'suggestedInstanceType' },
            { key: 6, text: 'AWS Region', value: 'awsRegion' },
        ]

        const sortOptions = [
            { key: 1, text: 'Saving Value', value: 'saving' },
            { key: 2, text: 'Non Optimized Value', value: 'nonOptimizedCost' },
            { key: 3, text: 'Non Optimized Count', value: 'nonOptimizedCount' },
            { key: 4, text: 'Optimized Value', value: 'optimizedCost' },
            { key: 5, text: 'Optimized Count', value: 'optimizedCount' },
            { key: 6, text: 'Instance Count', value: 'totalInstances' }
        ]

        const stateOptions = Object.keys(awsRegions).map((account) => ({
            key: account, text: account, value: awsRegions[account],
        }))

        return(
            <Menu inverted={false} className="menu-bar">
                <Menu.Item>Group By:</Menu.Item>
                <Dropdown 
                    options={groupOptions} simple item
                    onChange={(event, data)=>{this.handleDropdownChange(event, data, "groupBy")}} 
                    value={this.props.config.groupBy || "accountName"}
                />
                <Menu.Item>{this.props.instanceLength}</Menu.Item>

                <Menu.Item>Sort By:</Menu.Item>
                <Dropdown 
                    options={sortOptions} simple item
                    onChange={(event, data)=>{this.handleDropdownChange(event, data, "sortBy")}} 
                    value={this.props.config.sortBy || "nonOptimizedCost"}
                />
                <Menu.Item>Optimize By:</Menu.Item>
                <Menu.Item><input type='range' max='75' step='1' value={this.props.config.optimizeBy} onChange={this.handleOptimize} style={{width:"100%"}}/></Menu.Item>
                <Menu.Item>{this.props.config.optimizeBy}</Menu.Item>

                <Menu.Menu position='right'>
                    <SnapshotList snapshots={this.props.snapshots} cloudOptimizeSnapshots={this.props.cloudOptimizeSnapshots} fetchSnapshots={this.props.fetchSnapshots}/>
                    <Menu.Item>AWS Pricing Region:</Menu.Item>
                        <Dropdown 
                            options={stateOptions} simple item 
                            onChange={async (event, data)=>{
                                await this.props.fetchAwsPricing(data.value)
                                this.handleDropdownChange(event, data, "awsPricingRegion")
                            }} 
                            value={this.props.config.awsPricingRegion || "ap-southeast-2"}
                        />
                    <Configuration config={this.props.config} handleParentState={this.props.handleParentState} />
                </Menu.Menu>     
            </Menu>
        )
    }
}