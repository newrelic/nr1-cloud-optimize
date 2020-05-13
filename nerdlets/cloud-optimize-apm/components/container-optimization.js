import React from 'react'
import { Grid, Header, Statistic, Divider, Segment } from 'semantic-ui-react'

export default class ContainerOptimization extends React.Component {

    constructor(props){
        super(props)
    }


    render() {
        let { containerIds, containerMetrics } = this.props

        return (
            <>
                <Segment style={{width:"100%", marginLeft: "10px", marginRight: "10px"}}>
                    <Grid.Row style={{paddingTop:"5px"}}>
                        <Grid.Column>
                            <Header as='h4' style={{textTransform:"uppercase"}}>Container Statistics</Header>
                        </Grid.Column>
                    </Grid.Row>
                    <Divider/>
                    <Grid.Row>
                        <Grid.Column>
                                <Statistic.Group size="mini" widths='five'>
                                    <Statistic>
                                        <Statistic.Value>{containerIds.length}</Statistic.Value>
                                        <Statistic.Label>Containers</Statistic.Label>
                                    </Statistic>
                                    <Statistic>
                                        <Statistic.Value>{containerMetrics.MaxUniqueDailyContainers}</Statistic.Value>
                                        <Statistic.Label>Max Daily Unique Containers</Statistic.Label>
                                    </Statistic>
                                    <Statistic>
                                        <Statistic.Value>{containerMetrics.MaxCpuSysPerc.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                                        <Statistic.Label>Max Cpu %</Statistic.Label>
                                    </Statistic>
                                    <Statistic>
                                        <Statistic.Value>{containerMetrics.MaxMemPerc.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                                        <Statistic.Label>Max Memory %</Statistic.Label>
                                    </Statistic>
                                    <Statistic>
                                        <Statistic.Value>{(containerMetrics.MaxMemResidentBytes/1024/1024).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                                        <Statistic.Label>Max Memory Resident MB</Statistic.Label>
                                    </Statistic>
                                </Statistic.Group>
                        </Grid.Column>
                    </Grid.Row>
                </Segment>
            </>
        )
    }
}
