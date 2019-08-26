import React from 'react'
import PropTypes from 'prop-types'
import { Modal, Icon, Menu } from 'semantic-ui-react'
import SnapshotTable from './snapshotTable'
import _ from 'lodash'

export default class SnapshotList extends React.Component {

    // static propTypes = {
    //     nr1: PropTypes.object.isRequired,
    //     snapshots: PropTypes.object.isRequired,
    //     fetchSnapshots: PropTypes.object.isRequired,
    //     cloudOptimizeSnapshots: PropTypes.object.isRequired
    // }

    renderSnapshotList(groups){
        let grouped = _(groups)
            .groupBy(x => x.document["g"])
            .map((value, key) => { return {group: key, data: value}})
            .value();
        return(
            grouped.map((g, i)=>{
                return (
                   <div key={i}>
                        <h4>{g.group}</h4>
                        <div style={{overflow:"scroll"}}>
                            <div style={{display: "flex", fontSize:"11px"}}>
                                {g.data.map((snapshot,i)=><SnapshotTable key={i} data={snapshot.document} fetchSnapshots={this.props.fetchSnapshots} cloudOptimizeSnapshots={this.props.cloudOptimizeSnapshots} />)}
                            </div>
                        </div>
                   </div> 
                )
            })
        )
    }

    render(){
        return (
            this.props.snapshots.length > 0 ?
                <Modal size="fullscreen" trigger={<Menu.Item>View Snapshots ({this.props.snapshots.length}) &nbsp;<Icon name='clone' /></Menu.Item>}>
                    <Modal.Header>All Snapshots</Modal.Header>
                    <Modal.Content scrolling style={{backgroundColor:"black",color:"white"}}>
                        {this.renderSnapshotList(this.props.snapshots)}
                    </Modal.Content>
                </Modal>
            : 
            <Menu.Item>No Snapshots &nbsp;<Icon name='clone' /></Menu.Item>
        )
    }
}