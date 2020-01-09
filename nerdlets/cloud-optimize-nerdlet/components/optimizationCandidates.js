import React from 'react'
import { Button, Table, Icon, Modal } from 'semantic-ui-react'
import CsvDownload from 'react-json-to-csv'
import _ from 'lodash'

const monthlyHours = 720

export default class OptimizationCandidates extends React.Component {

    constructor(props){
        super(props)
        this.state = {
            column: null,
            direction: null,
            modalInstanceData: []
        }
    }

    handleTableSort(clickedColumn){
        if(this.state.column !== clickedColumn){
            this.setState({
              column: clickedColumn,
              modalInstanceData: _.sortBy(this.state.modalInstanceData, [clickedColumn]),
              direction: 'ascending',
            })
            return
        }
      
        this.setState({
            column: clickedColumn,
            modalInstanceData: this.state.modalInstanceData.reverse(),
            direction: this.state.direction === 'ascending' ? 'descending' : 'ascending',
        })
    }

    renderSuggestionsModal(suggestedInstanceType, suggestions){
        return (
            <Modal trigger={
                <Button style={{width:"100%"}} size="mini" inverted={false} 
                    content={<span>{suggestedInstanceType}&nbsp;<Icon style={{float:"right"}} name="list alternate outline"/></span>   
                } />
            }>
                <Modal.Header>Alternate Suggestions</Modal.Header>
                <Modal.Content>
                    <Table inverted={false} striped compact>
                        <Table.Header>
                            <Table.HeaderCell>instanceType</Table.HeaderCell>
                            <Table.HeaderCell>instanceFamily</Table.HeaderCell>
                            <Table.HeaderCell>cpu</Table.HeaderCell>
                            <Table.HeaderCell>mem</Table.HeaderCell>
                            <Table.HeaderCell>price /m</Table.HeaderCell>
                        </Table.Header>
                        <Table.Body>
                            {suggestions.map((suggestion, i)=>{
                                return (
                                    <Table.Row key={i}>
                                        <Table.Cell>{suggestion.instanceType}</Table.Cell>
                                        <Table.Cell>{suggestion.instanceFamily}</Table.Cell>
                                        <Table.Cell>{suggestion.vcpu}</Table.Cell>
                                        <Table.Cell>{suggestion.memory}</Table.Cell>
                                        <Table.Cell>{(suggestion.price * monthlyHours).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                                    </Table.Row>
                                )
                            })}
                        </Table.Body>
                    </Table>
                </Modal.Content>
        </Modal>
        )
    }

    render() {
        let exported = [...this.props.instances].filter((instance)=>instance.suggestion || instance.saving > 0)
        .map((instance)=>{
            let instanceData = {...instance}
            // delete arrays and objects to avoid any issues with csv export
            delete instanceData.suggestions
            delete instanceData.hostnameapmApplicationNamesentityGuidawsRegion
            if(instanceData.matchedInstance){
            	instanceData.matchedInstanceType = instanceData.matchedInstance['type']
            	instanceData.matchedInstanceCategory = instanceData.matchedInstance['category']
            	instanceData.matchedInstancePrice = instanceData.matchedInstance['onDemandPrice']
              }
            for(let z=0;z<Object.keys(instanceData).length;z++){
                if(Array.isArray(instanceData[Object.keys(instanceData)[z]])){
                    delete instanceData[Object.keys(instanceData)[z]]
                }
            }
            return instanceData
        })

        return (
            <Modal size="fullscreen" trigger={<Button size="mini" onClick={()=>this.setState({modalInstanceData: this.props.instances, column: null, direction: null})}>Show Optimization Candidates</Button>}>
                <Modal.Header>Optimization Candidates - {this.props.header}<span style={{float:"right"}}>
                    <CsvDownload style={{
                        borderRadius:"6px",
                        border:"1px solid #000000",
                        display:"inline-block",
                        fontSize:"15px",
                        fontWeight:"bold",
                        padding:"6px 24px",
                        textDecoration:"none",
                        cursor:"pointer"
                        }} data={exported}>Export Data
                    </CsvDownload></span>
                </Modal.Header>
                <Modal.Content>
                    <Table inverted={false} striped sortable size="small">
                        <Table.Header>
                            <Table.Row>
                                <Table.HeaderCell
                                    sorted={this.state.column === 'hostname' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('hostname')}>
                                host</Table.HeaderCell>
                                <Table.HeaderCell
                                    sorted={this.state.column === 'entityName' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('entityName')}>
                                entity</Table.HeaderCell>
                                <Table.HeaderCell
                                    sorted={this.state.column === 'maxCpuPercent' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('maxCpuPercent')}>
                                maxCpuPercent
                                </Table.HeaderCell>
                                <Table.HeaderCell
                                    sorted={this.state.column === 'maxMemoryPercent' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('maxMemoryPercent')}>
                                maxMemoryPercent
                                </Table.HeaderCell>
                                <Table.HeaderCell
                                    sorted={this.state.column === 'transmitBytesPerSecond' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('transmitBytesPerSecond')}>
                                maxTransmitBytes/s
                                </Table.HeaderCell>
                                <Table.HeaderCell
                                    sorted={this.state.column === 'receiveBytesPerSecond' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('receiveBytesPerSecond')}>
                                maxReceiveBytes/s
                                </Table.HeaderCell>
                                <Table.HeaderCell
                                    sorted={this.state.column === 'numCpu' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('numCpu')}>
                                numCpu
                                </Table.HeaderCell>                                 
                                <Table.HeaderCell
                                    sorted={this.state.column === 'memGB' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('memGB')}>
                                memGB
                                </Table.HeaderCell>                                   
                                <Table.HeaderCell
                                    sorted={this.state.column === 'instanceType' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('instanceType')}>
                                instanceType
                                </Table.HeaderCell>                                
                                <Table.HeaderCell
                                    sorted={this.state.column === 'instancePrice1' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('instancePrice1')}>
                                price /m
                                </Table.HeaderCell>
                                <Table.HeaderCell
                                    sorted={this.state.column === 'suggestedInstanceType' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('suggestedInstanceType')}>
                                suggestedInstanceType
                                </Table.HeaderCell>
                                <Table.HeaderCell
                                    sorted={this.state.column === 'instancePrice2' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('instancePrice2')}>
                                    suggested price /m
                                </Table.HeaderCell>
                                <Table.HeaderCell 
                                    sorted={this.state.column === 'saving' ? this.state.direction : null}
                                    onClick={()=>this.handleTableSort('saving')}>
                                    saving /m
                                </Table.HeaderCell>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {this.state.modalInstanceData.map((instance, i)=>{
                                if(instance.suggestion && instance.saving>0){
                                    let tempSuggestions = instance.suggestions && instance.suggestions.all ? [...instance.suggestions.all] : []
                                    tempSuggestions.shift()

                                    let link = "https://one.newrelic.com/redirect/entity/"+instance.entityGuid
                                    return (
                                        <Table.Row key={i} active={instance.suggestedInstanceType == "stale"}>
                                            <Table.Cell><a style={{color: instance.suggestedInstanceType == "stale" ? "black" : "black"}} href={link} rel="noopener noreferrer" target="_blank">{instance.hostname} <Icon name='external alternate' /></a></Table.Cell>
                                            <Table.Cell><a style={{color: instance.suggestedInstanceType == "stale" ? "black" : "black"}} href={link} rel="noopener noreferrer" target="_blank">{instance.entityName} <Icon name='external alternate' /></a></Table.Cell>
                                            <Table.Cell>{instance.maxCpuPercent.toFixed(2)}</Table.Cell>
                                            <Table.Cell>{instance.maxMemoryPercent.toFixed(2)}</Table.Cell>
                                            <Table.Cell>{instance.transmitBytesPerSecond.toFixed(2)}</Table.Cell>
                                            <Table.Cell>{instance.receiveBytesPerSecond.toFixed(2)}</Table.Cell>
                                            <Table.Cell>{instance.numCpu}</Table.Cell>
                                            <Table.Cell>{instance.memGB}</Table.Cell>
                                            <Table.Cell>{instance.instanceType}</Table.Cell>
                                            <Table.Cell>{(instance.instancePrice1 * monthlyHours).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                                            <Table.Cell style={{textAlign:"center"}}>
                                             {tempSuggestions.length > 0 ?  this.renderSuggestionsModal(instance.suggestedInstanceType, tempSuggestions) : instance.suggestedInstanceType}
                                            </Table.Cell>
                                            <Table.Cell>{(instance.instancePrice2 * monthlyHours).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                                            <Table.Cell>{(instance.saving * monthlyHours).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                                        </Table.Row>
                                    )
                                }
                            })}
                        </Table.Body>
                    </Table>
                </Modal.Content>
            </Modal>
        )
    }
}
