import React from 'react'
import { Card, Table, Icon, Dimmer, Loader, Segment } from 'semantic-ui-react'
import OptimizationCandidates from './optimizationCandidates'
import SnapshotCard from './snapshots/snapshotCard'

export default class AccountCards extends React.Component {

    render() {
        let isLoading = this.props.loading || this.props.completedAccounts != this.props.accounts
        let noAccounts = isLoading == false && this.props.accounts == 0

        return (
            <Segment className="segment-clear" style={{textAlign:"center", marginTop:"0px", minHeight:this.props.height}}>
                <Dimmer active={isLoading}>
                    <Loader style={{top:"150px"}} size="big">
                        Please be patient while we analyze your Accounts and Instances... <br/><br/>
                        {this.props.completedAccounts} of {this.props.accounts} Accounts Inspected <br/><br/>
                        {this.props.instances} Instances Inspected
                    </Loader>
                </Dimmer>
                
                <h2 style={{ display: noAccounts ? "" : "none" }}>
                    Unable to load accounts!
                </h2>
                <h2 style={{ display: noAccounts ? "" : "none" }}>
                    Please refresh to try again, and ensure you are using a UUID associated to your account.
                </h2>

                <Card.Group style={{margin:"auto","width":"100%"}} centered>
                    {this.props.sorted.map((item, i)=>{
                        let header = item.group
                        if(this.props.config.groupBy == "apmApplicationNames"){
                            let apps = item.group ? item.group.split("|").filter(Boolean) : "uncategorized"
                            header = apps.map((app,i)=>i+1 == apps.length ? app : app + ", ")
                        }

                        header = (header == "null" || !header) ? "uncategorized" : header

                        if((this.props.config.groupBy || this.props.groupByDefault) == "accountName"){
                            header = <a className="card-content-light" href={`https://rpm.newrelic.com/accounts/${item.instances[0].accountId}`} rel="noopener noreferrer" target="_blank">{header} <Icon name='external alternate' /></a>
                        }

                        return (
                            <Card key={i} className="card card-light" color="green" style={{minWidth:"350px"}}>
                            <Card.Content className="card-content-light">
                                <span style={{fontSize:"13px"}}>{header}</span>
                                <span style={{float:"right", cursor:"pointer"}}><SnapshotCard fetchSnapshots={this.props.fetchSnapshots} config={this.props.config} data={item} snapshots={this.props.snapshots} cloudOptimizeSnapshots={this.props.cloudOptimizeSnapshots}/></span>
                            </Card.Content>
                            <Card.Content style={{paddingTop:"5px", paddingBottom:"5px"}}>
                            <Table celled inverted={false} basic='very'>
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
                                <OptimizationCandidates instances={item.instances} header={header} />
                            </Card.Content>
                        </Card>)
                    })}
                </Card.Group>
            </Segment>
        )
    }
}