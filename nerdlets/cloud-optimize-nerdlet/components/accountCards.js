import React from 'react'
import PropTypes from 'prop-types'
import { Card, Table, Icon } from 'semantic-ui-react'
import OptimizationCandidates from './optimizationCandidates'
import SnapshotCard from './snapshots/snapshotCard'

export default class AccountCards extends React.Component {

    // static propTypes = {
    //     nr1: PropTypes.object.isRequired,
    //     config: PropTypes.object.isRequired,
    //     sorted: PropTypes.object.isRequired,
    //     groupByDefault: PropTypes.object.isRequired,
    //     handleParentState: PropTypes.object.isRequired,
    //     cloudOptimizeSnapshots: PropTypes.object.isRequired,
    //     fetchSnapshots: PropTypes.object.isRequired,
    //     snapshots: PropTypes.object.isRequired
    // }

    render() {
        return (
            <div style={{textAlign:"center"}}>
                <Card.Group style={{margin:"auto","width":"100%"}} centered>
                    {this.props.sorted.map((item, i)=>{
                        let header = item.group
                        if(this.props.config.groupBy == "apmApplicationNames"){
                            let apps = item.group ? item.group.split("|").filter(Boolean) : "uncategorized"
                            header = apps.map((app,i)=>i+1 == apps.length ? app : app + ", ")
                        }

                        header = (header == "null" || !header) ? "uncategorized" : header

                        if((this.props.config.groupBy || this.props.groupByDefault) == "accountName"){
                            header = <a style={{color:"white"}} href={`https://rpm.newrelic.com/accounts/${item.instances[0].accountId}`} rel="noopener noreferrer" target="_blank">{header} <Icon name='external alternate' /></a>
                        }

                        return (
                            <Card key={i} style={{marginBottom:"1px", width:"400px", backgroundColor:"rgb(51, 51, 51)"}} color="green">
                            <Card.Content style={{color:"white"}} >
                                <span style={{fontWeight:"bold", fontSize:"13px"}}>{header}</span>
                                <span style={{float:"right"}}><SnapshotCard fetchSnapshots={this.props.fetchSnapshots} config={this.props.config} data={item} snapshots={this.props.snapshots} cloudOptimizeSnapshots={this.props.cloudOptimizeSnapshots}/></span>
                            </Card.Content>
                            <Card.Content>
                            <Table celled inverted>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.HeaderCell></Table.HeaderCell>
                                        <Table.HeaderCell>Monthly</Table.HeaderCell>
                                        <Table.HeaderCell>Yearly</Table.HeaderCell>
                                    </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                    <Table.Row>
                                        <Table.Cell>Non-Optimized</Table.Cell>
                                        <Table.Cell>${(item.nonOptimizedCost*720).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                                        <Table.Cell>${(item.nonOptimizedCost*720*12).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell>Optimized</Table.Cell>
                                        <Table.Cell>${(item.optimizedCost*720).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                                        <Table.Cell>${(item.optimizedCost*720*12).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                                    </Table.Row>
                                    <Table.Row>
                                        <Table.Cell positive>Saving</Table.Cell>
                                        <Table.Cell positive>${(item.saving*720).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                                        <Table.Cell positive>${(item.saving*720*12).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                                    </Table.Row>
                                    </Table.Body>
                                    <Table.Footer>
                                    <Table.Row>
                                        <Table.HeaderCell style={{textAlign:"right"}} colSpan={3}>{item.nonOptimizedCount} of {item.totalInstances} Instances to Optimize | {item.nonOptimizedCost > 0 ? ((Math.abs(item.saving)/(item.nonOptimizedCost)) * 100).toFixed(2) : 0}% Cost Saving</Table.HeaderCell>
                                    </Table.Row>
                                    </Table.Footer>
                                </Table>
                            </Card.Content>
                            <Card.Content>
                                <OptimizationCandidates instances={item.instances} />
                            </Card.Content>
                        </Card>)
                    })}
                </Card.Group>
            </div>
        )
    }
}