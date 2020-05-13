import React from 'react'
import { Button, Table } from 'semantic-ui-react'
import { deleteDocument } from '../../../shared/lib/utils'
export default class SnapshotTable extends React.Component {

    constructor(props){
        super(props)
        this.deleteSnapshot = this.deleteSnapshot.bind(this)
    }

    async deleteSnapshot(timestamp){
        await deleteDocument("cloudOptimizeSnapshots", `ss_${timestamp}`)
        this.props.fetchSnapshots()
    }

    render(){
        let data = this.props.data
        let timestamp = data.t ? new Date(data.t).toString().split(" ").filter((item,i)=>i<5&&i>0).join(' ') : ""
        let currentTimestamp = new Date().toString().split(" ").filter((item,i)=>i<5&&i>0).join(' ')
        return(
            <Table celled inverted={false} style={{
                width:"400px", 
                minWidth: "400px",
                margin: "5px",
                // overflowX: "auto",
              }}>
                <Table.Header>
                    <Table.Row>
                        <Table.HeaderCell>{timestamp?timestamp:<span>Current State</span>}</Table.HeaderCell>
                        <Table.HeaderCell>Monthly</Table.HeaderCell>
                        <Table.HeaderCell>Yearly</Table.HeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    <Table.Row>
                        <Table.Cell>Non-Optimized</Table.Cell>
                        <Table.Cell>${((data.nonOptimizedCost||data.noc)*720).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                        <Table.Cell>${((data.nonOptimizedCost||data.noc)*720*12).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell>Optimized</Table.Cell>
                        <Table.Cell>${((data.optimizedCost||data.oc)*720).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                        <Table.Cell>${((data.optimizedCost||data.oc)*720*12).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell positive>Saving</Table.Cell>
                        <Table.Cell positive>${((data.saving||data.s)*720).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                        <Table.Cell positive>${((data.saving||data.s)*720*12).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}</Table.Cell>
                    </Table.Row>
                </Table.Body>
                <Table.Footer>
                    <Table.Row>
                        <Table.HeaderCell style={{textAlign:"right"}} colSpan={3}>
                            {(data.nonOptimizedCount||data.noi)}/{(data.totalInstances||(data.noi+data.oi))} Instances to Optimize | {data.nonOptimizedCost||data.noc > 0 ? ((Math.abs(data.saving||data.s)/(data.nonOptimizedCost||data.noc)) * 100).toFixed(2) : 0}% Cost Saving <br/>
                            {data.t? <span><br/><Button inverted={false} size="mini" content="Delete Snapshot" onClick={()=>this.deleteSnapshot(data.t)} /></span>:<span><br/>{currentTimestamp}<br/></span>}
                        </Table.HeaderCell>
                    </Table.Row>
                </Table.Footer>
            </Table>
        )
    }
}