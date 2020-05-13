import React from 'react'
import { Segment, Grid} from 'semantic-ui-react'
import { ChartGroup, LineChart } from 'nr1';

export default class MainCharts extends React.Component {
    render() {
        let { entityData, hosts, containerIds } = this.props
        let chartStyle = {height:"310px", width:"100%"}
        let chartHeader = {textTransform:"uppercase", paddingTop: "5px"}

        return (
            <Grid.Row style={{paddingTop:"5px"}}>
                <ChartGroup>
                    <Grid.Column>
                        <Segment className="segment-clear" >
                            <h4 style={chartHeader}>Host System Performance - Max Cpu & Memory</h4>
                            { entityData && entityData.account && entityData.account.id ? 
                                    <LineChart
                                    style={chartStyle}
                                    accountId={entityData.account.id}
                                    query={`SELECT max(cpuPercent) as 'CpuPerc', max(memoryUsedBytes/memoryTotalBytes) as 'MemPerc' FROM SystemSample FACET hostname WHERE hostname IN (${"'" + hosts.join("','") + "'"}) SINCE 1 WEEK AGO TIMESERIES`}
                                /> : ""
                            }
                        </Segment>
                    </Grid.Column>

                    <Grid.Column>
                        <Segment className="segment-clear" >
                            <h4 style={chartHeader}>Host Network Performance - Max Tx & Rx</h4>
                            { entityData && entityData.account && entityData.account.id ? 
                                    <LineChart
                                    style={chartStyle}
                                    accountId={entityData.account.id}
                                    query={`SELECT max(receiveBytesPerSecond) as 'RxBytesPerSec', max(transmitBytesPerSecond) as 'TxBytesPerSec' FROM NetworkSample FACET hostname WHERE hostname IN (${"'" + hosts.join("','") + "'"}) SINCE 1 WEEK AGO TIMESERIES`}
                                /> : ""
                            }
                        </Segment>
                    </Grid.Column>
                    
                    {containerIds.length > 0 ? 
                    <Grid.Column>
                        <Segment className="segment-clear" >
                            <h4 style={chartHeader}>Container Performance - Max Cpu & Memory</h4>
                            { entityData && entityData.account && entityData.account.id ? 
                                    <LineChart
                                    style={chartStyle}
                                    accountId={entityData.account.id}
                                    query={`SELECT max(cpuSystemPercent/numeric(coreCount)) as 'CpuSysPerc', max(memoryResidentSizeBytes/numeric(systemMemoryBytes))*100 as 'MemPerc' FROM ProcessSample FACET containerId WHERE apmApplicationIds LIKE '%${entityData.applicationId}%' SINCE 1 WEEK AGO TIMESERIES LIMIT 25`}
                                /> : ""
                            }
                        </Segment>
                    </Grid.Column> : ""
                    }
                </ChartGroup>
            </Grid.Row>
        )
    }
}
