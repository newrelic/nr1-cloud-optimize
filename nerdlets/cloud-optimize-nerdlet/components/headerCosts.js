import React from 'react'
import PropTypes from 'prop-types'
import { Segment, Statistic, Popup, Icon } from 'semantic-ui-react'

export default class HeaderCost extends React.Component {

    static propTypes = {
        totals: PropTypes.object.isRequired,
        multiplier: PropTypes.number.isRequired,
        title: PropTypes.string.isRequired,
    }

    render() {
        return (
            <Segment inverted style={{marginBottom:"0px", textAlign:"center"}}> 
                <Statistic inverted horizontal style={{marginBottom:"0px"}}>
                    <Popup content='Estimated cost associated to EC2 Optimization Candidates before Right Sizing' trigger={<Statistic.Label>{this.props.title} &nbsp;&nbsp;&nbsp;&nbsp; Non-Optimized &nbsp;&nbsp;</Statistic.Label>} />
                    <Statistic.Value>${(this.props.totals.nonOptimizedCost * this.props.multiplier).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                    <Popup content='New Estimated cost associated to EC2 Optimization Candidates after Right Sizing' trigger={<Statistic.Label>Optimized &nbsp;&nbsp;</Statistic.Label>} />
                    <Statistic.Value>${(this.props.totals.optimizedCost * this.props.multiplier).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                    <Popup content='Savings based on difference between Non-Optimized & Optimized cost estimates' trigger={<Statistic.Label>Potential Savings &nbsp;&nbsp;</Statistic.Label>} />
                    <Statistic.Value>${(this.props.totals.saving * this.props.multiplier).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Statistic.Value>
                </Statistic> &nbsp;&nbsp;&nbsp;
                {/* <div style={{float: "right", display: this.props.loading ? "" : "none"}}>
                    <Icon loading name='spinner' />
                </div> */}
            </Segment>
        )
    }
}