import React from 'react'
import { Statistic } from 'semantic-ui-react'
import PricingSelector from '../../shared/components/pricingSelector'
import Config from '../../shared/components/config'

export default class MenuBar extends React.Component {

    constructor(props){
        super(props)
        this.handleOptimize = this.handleOptimize.bind(this)
    }


    async handleOptimize(e){
        let tempConfig = this.props.config
        tempConfig["optimizeBy"] = e.target.value
        await this.props.handleParentState("config", tempConfig, "groupAndSortRecalc")
    }

    render() {

        let { totals } = this.props
        let optimizedPerc = (totals.optimizedCount / (totals.nonOptimizedCount + totals.optimizedCount)) * 100
        let savings = "$"+(totals.saving * 720 * 12).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')

        return (
            <div className="utility-bar">
                    {/* <Button className="filter-button" icon="chart line" content="View" style={{float:"left"}}/> */}


                    <div style={{backgroundColor:"#fafbfb", height:"45px", borderRadius:"3px", paddingLeft:"15px", paddingRight:"15px", marginTop:"10px", marginBottom:"10px"}}>
                        <Statistic size="small" horizontal label={`Optimized`} value={(isNaN(optimizedPerc) ? "0" : optimizedPerc) + "%"} style={{marginTop:"7px"}}/>
                    </div>

                    <div style={{backgroundColor:"#fafbfb", height:"45px", borderRadius:"3px", paddingLeft:"15px", paddingRight:"15px", marginTop:"10px", marginBottom:"10px"}}>
                        <Statistic size="small" horizontal label={`Potential Yearly Saving`} value={savings} style={{marginTop:"7px"}}/>
                    </div>


                    <div className="flex-push"></div>


                    <div style={{backgroundColor:"#fafbfb", height:"45px", borderRadius:"3px"}}>
                        <span style={{width:"90%", textTransform:"uppercase", fontWeight:600, lineHeight:"45px", verticalAlign:"middle"}}>&nbsp;&nbsp;Optimize By: {this.props.config.optimizeBy}%&nbsp;</span>
                    </div>

                    <div style={{backgroundColor:"#fafbfb", height:"45px", marginRight:"10px", borderRadius:"3px", width:"200px", lineHeight:"45px"}}>
                        <input style={{width:"90%", marginLeft:"10px", marginRight:"10px", lineHeight:"45px"}} type='range' max='80' step='1' min='10' value={this.props.config.optimizeBy} onChange={this.handleOptimize}/>
                    </div>


                    <Config 
                        button
                        config={this.props.config} 
                        handleParentState={this.props.handleParentState} 
                    />

                    <PricingSelector 
                        button
                        config={this.props.config} 
                        cloudRegions={this.props.cloudRegions} 
                        handleParentState={this.props.handleParentState} 
                        fetchCloudPricing={this.props.fetchCloudPricing} 
                    />

            </div>
        )
    }
}
