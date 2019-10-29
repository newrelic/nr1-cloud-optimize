import React from 'react'
import { Segment, Statistic, Popup, Icon, Modal, List } from 'semantic-ui-react'

export default class HeaderCost extends React.Component {
    render() {
        return (
            <Segment inverted={false} className="header-bar header-bar-light" style={{position:"relative"}}> 
                <Statistic inverted={false} horizontal style={{marginBottom:"0px"}}>
                    <Popup basic content='Estimated cost associated to EC2 Optimization Candidates before Right Sizing' trigger={<Statistic.Label>{this.props.title} &nbsp;&nbsp;&nbsp;&nbsp; Non-Optimized &nbsp;&nbsp;</Statistic.Label>} />
                    <Statistic.Value>${(this.props.totals.nonOptimizedCost * this.props.multiplier).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                    <Popup basic content='New Estimated cost associated to EC2 Optimization Candidates after Right Sizing' trigger={<Statistic.Label>Optimized &nbsp;&nbsp;</Statistic.Label>} />
                    <Statistic.Value>${(this.props.totals.optimizedCost * this.props.multiplier).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                    <Popup basic content='Savings based on difference between Non-Optimized & Optimized cost estimates' trigger={<Statistic.Label>Potential Savings &nbsp;&nbsp;</Statistic.Label>} />
                    <Statistic.Value>${(this.props.totals.saving * this.props.multiplier).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                </Statistic> &nbsp;&nbsp;&nbsp;
                <Modal trigger={<Icon style={{cursor:"pointer", float:"right"}} name='question' color='blue' size='large' circular />}>
                    <Modal.Header>Optimization Logic & Features</Modal.Header>
                    <Modal.Content>
                    <Modal.Description>
                        <List bulleted relaxed>
                            <List.Item>A one week period is inspected observing your System and Network Sample events, if an instance has reported in at least the past N hours it will be considered for optimization.</List.Item>
                            <List.Item>Optimize By slider: this selects instances for optimization that are below N% CPU or Memory Utilization.</List.Item>
                            <List.Item>Set Cloud Regions: select pricing region for each cloud vendor.</List.Item>
                            <List.Item>Configuration: this provides many additional options to tune the suggestions and instance types returned.
                                <List.List>
                                    <List.Item>Inclusion Period: as described above will adjust the period the instance must have last reported in.</List.Item>
                                    <List.Item>Discount Multiplier: useful for applying EDP discounts.</List.Item>
                                    <List.Item>Stale Instance Detection: various options to consider an instance stale, when an instance is detected as stale no optimization suggestion will be returned but instead be seen as an instance you should consider decommissioning with a direct saving.</List.Item>
                                    <List.Item>Instance Type Filter: perhaps you do not want t2 or t3 type instances, then simply apply those filters.</List.Item>
                                    <List.Item>Right Sizing: when an instance is considered a candidate for optimization, the CPU and Memory values are multiplied by these configured values to find an appropriate candidate. eg. if you are looking at candidates that are below 40% cpu you can assume halfing the instances size could be appropriate. Note that multiple suggestions are returned to cater if you would like a bit more or bit less resources.</List.Item>
                                </List.List>
                            </List.Item>
                        </List>
                    </Modal.Description>
                    </Modal.Content>
                </Modal>
                <div style={{float:"left", position: "absolute", top:"16px", width:"130px"}}>
                    <List style={{textAlign:"left"}}>
                        <Popup basic content='Number of New Relic Accounts Inspected' trigger={
                            <List.Item>
                                <List.Icon name='sitemap' style={{width:"18px", paddingRight:"3px"}} />
                                <List.Content>{this.props.completedAccounts} Accounts</List.Content>
                            </List.Item>
                        } />  
                        <Popup basic content='Number of Instances Inspected' trigger={
                            <List.Item>
                                <List.Icon name='server' style={{width:"18px", paddingRight:"7px"}}/>
                                <List.Content>{this.props.instances} Instances</List.Content>
                            </List.Item>
                        } />
                    </List>
                </div>
            </Segment>
        )
    }
}
