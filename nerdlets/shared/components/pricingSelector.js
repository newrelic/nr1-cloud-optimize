import React from 'react'
import { Dropdown, Modal, Menu, Form, Button } from 'semantic-ui-react'

export default class PricingSelector extends React.Component {

    constructor(props){
        super(props)
        this.handleConfigurator = this.handleConfigurator.bind(this)
    }

    async handleConfigurator(e,data,type){
        let tempConfig = this.props.config
        if(data.value && data.name){
            tempConfig.cloudData[data.name] = data.value
            await this.props.fetchCloudPricing(tempConfig)
            await this.props.handleParentState("config", tempConfig, "groupAndSortRecalc")
        }
    }

    render() {
        let amazonRegions = this.props.cloudRegions.amazon.map((region)=>{
            return {  "key": region.name, "text": region.name, "value": region.id }
        })

        let googleRegions = this.props.cloudRegions.google.map((region)=>{
            return {  "key": region.name, "text": region.name, "value": region.id }
        })

        let azureRegions = this.props.cloudRegions.azure.map((region)=>{
            return {  "key": region.name, "text": region.name, "value": region.id }
        })

        return <Modal trigger={this.props.button ? <Button className="filter-button" icon="cloud" content="Set Cloud Regions"/> : <Menu.Item>Set Cloud Regions</Menu.Item>}>
                    <Modal.Header>Configure Regions</Modal.Header>
                    <Modal.Content>
                        <Form inverted={false} style={{height:"100%"}}>
                            <Form.Field>
                                <label style={{width:"100%"}}>AWS Region</label>
                                <Dropdown 
                                    options={amazonRegions}
                                    selection
                                    fluid
                                    name="amazon"
                                    value={this.props.config.cloudData.amazon}
                                    onChange={this.handleConfigurator}
                                />
                            </Form.Field>
                            <Form.Field>
                                <label style={{width:"100%"}}>Azure Region</label>
                                <Dropdown 
                                    options={azureRegions}
                                    selection
                                    fluid
                                    name="azure"
                                    value={this.props.config.cloudData.azure}
                                    onChange={this.handleConfigurator}
                                />
                            </Form.Field>
                            <Form.Field>
                                <label style={{width:"100%"}}>Google Region</label>
                                <Dropdown 
                                    options={googleRegions}
                                    selection
                                    fluid
                                    name="google"
                                    value={this.props.config.cloudData.google}
                                    onChange={this.handleConfigurator}
                                />
                            </Form.Field>
                        </Form>
                    </Modal.Content>
                </Modal>
    }
}