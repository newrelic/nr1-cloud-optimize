import React from 'react';
import { Divider, Form, Icon, Input, Modal, Menu, Dropdown, Button } from 'semantic-ui-react';
import { deleteDocument } from '../lib/utils';

export default class Config extends React.Component {

    constructor(props){
        super(props)
        this.handleConfigurator = this.handleConfigurator.bind(this)
    }

    async handleConfigurator(e,data,type){
        let tempConfig = this.props.config
        if(!isNaN(data.value)){
            tempConfig[type] = data.value
            await this.props.handleParentState("config",tempConfig,"groupAndSortRecalc")
        }else{
            tempConfig[type] = type.includes("stale") ? 0 : 1
            await this.props.handleParentState("config",tempConfig,"groupAndSortRecalc")
        }
    }

    handleAddition = async (e, { value }) => {
        let tempConfig = this.props.config
        tempConfig["instanceOptions"] = [{ text: value, value }, ...this.props.config.instanceOptions]
        await this.props.handleParentState("config",tempConfig)
    }
    
    handleChange = async (e, { value }) => {
        let tempConfig = this.props.config
        tempConfig["instanceOptionsCurrent"] = value
        await this.props.handleParentState("config",tempConfig,"groupAndSortRecalc")
    }

    render() {
        let labelWidth = "230px"
        return (
            <Modal size="small" trigger={this.props.button ? <Button className="filter-button" icon="cog" content="Configuration"/> : <Menu.Item>Configuration &nbsp;<Icon name='cog' /></Menu.Item>}>
                <Modal.Header>Advanced Configuration</Modal.Header>
                <Modal.Content className="config config-dark">
                    <Form inverted={false}>
                        <Form.Field inline>
                            <label style={{width:labelWidth}}>Inclusion Period (hours)</label>
                            <Input inverted={false} value={this.props.config.lastReportPeriod} onChange={(e,data)=>{this.handleConfigurator(e,data,"lastReportPeriod")}}/>
                        </Form.Field>
                        <label>Instance needs to have reported at least once within this period.</label>
                        <Divider />

                        <Form.Field inline>
                            <label style={{width:labelWidth}}>Discount Multiplier</label>
                            <Input inverted={false} value={this.props.config.discountMultiplier} onChange={(e,data)=>{this.handleConfigurator(e,data,"discountMultiplier")}}/>
                        </Form.Field>
                        <label>Factor any discounts in such as EDP, eg. 0.9 equals 10% discount.</label>
                        <Divider />

                        <Form.Field inline>
                            <label style={{width:labelWidth}}>Stale Instance CPU %</label>
                            <Input inverted={false} value={this.props.config.staleInstanceCpu} onChange={(e,data)=>{this.handleConfigurator(e,data,"staleInstanceCpu")}}/>
                        </Form.Field>
                        <Form.Field inline>
                            <label style={{width:labelWidth}}>Stale Instance Memory %</label>
                            <Input inverted={false} value={this.props.config.staleInstanceMem} onChange={(e,data)=>{this.handleConfigurator(e,data,"staleInstanceMem")}}/>
                        </Form.Field>
                        <Form.Field inline>
                            <label style={{width:labelWidth}}>Stale Transmit Bytes/s</label>
                            <Input inverted={false} value={this.props.config.staleTransmitBytesPerSecond} onChange={(e,data)=>{this.handleConfigurator(e,data,"staleTransmitBytesPerSecond")}}/>
                        </Form.Field>
                        <Form.Field inline>
                            <label style={{width:labelWidth}}>Stale Receive Bytes/s</label>
                            <Input inverted={false} value={this.props.config.staleReceiveBytesPerSecond} onChange={(e,data)=>{this.handleConfigurator(e,data,"staleReceiveBytesPerSecond")}}/>
                        </Form.Field>
                        <label>Automatically class instances as stale using max values. Anything set to 0 will disable the stale check.</label>
                        <Divider />

                        <Form.Field>
                            <label style={{width:labelWidth}}>Instance Type Filter</label>

                            <Dropdown 
                                options={this.props.config.instanceOptions}
                                placeholder=''
                                search
                                selection
                                fluid
                                multiple
                                allowAdditions
                                value={this.props.config.instanceOptionsCurrent}
                                onAddItem={this.handleAddition}
                                onChange={this.handleChange}
                            />
                        </Form.Field>
                        <label>Filter instance types out, eg. &quot;t2&quot;.</label>
                        <Divider />

                        <Form.Field inline>
                            <label style={{width:labelWidth}}>Right Size CPU %</label>
                            <Input inverted={false} value={this.props.config.rightSizeCpu} onChange={(e,data)=>{this.handleConfigurator(e,data,"rightSizeCpu")}}/>
                        </Form.Field>
                        <Form.Field inline>
                            <label style={{width:labelWidth}}>Right Size Memory %</label>
                            <Input inverted={false} value={this.props.config.rightSizeMem} onChange={(e,data)=>{this.handleConfigurator(e,data,"rightSizeMem")}}/>
                        </Form.Field>
                        <label>The instance(s) that get dynamically selected for right sizing can be tuned here.</label>

                    </Form>
                </Modal.Content>

                <Modal.Actions>
                    <Button onClick={async ()=>{ await deleteDocument("cloudOptimizeCfg", "main"); location.reload() }} negative>
                        Reset to defaults
                    </Button>
                </Modal.Actions>

            </Modal>
        )
    }
}