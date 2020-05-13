import React from 'react'
import { Grid, Header, Statistic, Divider, Segment } from 'semantic-ui-react'

export default class HostMetrics extends React.Component {

    constructor(props){
        super(props)
    }


    render() {
        let { hostMetrics } = this.props

        return (
            <>
                <Segment style={{width:"100%", marginLeft: "10px", marginRight: "10px"}}>
                    <Grid.Row style={{paddingTop:"5px"}}>
                        <Grid.Column>
                            <Header as='h4' style={{textTransform:"uppercase"}}>Host Statistics</Header>
                        </Grid.Column>
                    </Grid.Row>
                    <Divider/>
                    <Grid.Row>
                        <Grid.Column>
                                <Statistic.Group size="mini" widths='five'>
                                    <Statistic>
                                        <Statistic.Value>{hostMetrics.Hosts}</Statistic.Value>
                                        <Statistic.Label>Hosts</Statistic.Label>
                                    </Statistic>
                                    <Statistic>
                                        <Statistic.Value>{hostMetrics.uniqueDailyHosts}</Statistic.Value>
                                        <Statistic.Label>Max Daily Unique Hosts</Statistic.Label>
                                    </Statistic>
                                    <Statistic>
                                        <Statistic.Value>{hostMetrics.MaxCpuPercent.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                                        <Statistic.Label>Max Cpu %</Statistic.Label>
                                    </Statistic>
                                    <Statistic>
                                        <Statistic.Value>{hostMetrics.MaxMemPerc.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                                        <Statistic.Label>Max Memory %</Statistic.Label>
                                    </Statistic>
                                    <Statistic>
                                        <Statistic.Value>{(hostMetrics.MaxMemoryBytes/1024/1024).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                                        <Statistic.Label>Max Memory Used MB</Statistic.Label>
                                    </Statistic>
                                </Statistic.Group>
                        </Grid.Column>
                    </Grid.Row>
                </Segment>
            </>
        )
    }
}
