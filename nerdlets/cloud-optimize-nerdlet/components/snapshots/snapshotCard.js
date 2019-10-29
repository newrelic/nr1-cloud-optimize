import React from 'react'
import { Modal, Icon, Button, Table } from 'semantic-ui-react'
import SnapshotTable from './snapshotTable'
import { writeDocument } from '../../../shared/lib/utils'

export default class SnapshotCard extends React.Component {

    constructor(props){
        super(props)
        this.state = { configMatch: true }
        this.readSnapshots = this.readSnapshots.bind(this)
        this.writeSnapshot = this.writeSnapshot.bind(this)
    }

    async writeSnapshot(data, config){
        let payload = {
            t: new Date().getTime(),
            c: config,
            g: data.group,
            noc: data.nonOptimizedCost,
            oc: data.optimizedCost,
            s: data.saving,
            noi: data.nonOptimizedCount,
            oi: data.optimizedCount,
        }
        await writeDocument("cloudOptimizeSnapshots", `ss_${payload.t}`, payload)
        this.props.fetchSnapshots()
    }

    readSnapshots(group){
        return this.props.snapshots.filter((snapshot)=>group == snapshot.document.g).map((ss)=>{
            ss.document.configMatch = (JSON.stringify(this.props.config) == JSON.stringify(ss.document.c))
            return ss.document
        })
    }

    writeSnapshotButton(){
        return(
            <Button 
                icon="camera" 
                content="Snapshot" 
                style={{
                    backgroundColor: "white", color:"black",
                    borderRadius:"6px", border:"1px solid #000000",
                    fontSize:"15px", fontWeight:"bold",
                    display:"inline-block",
                    float:"right",
                    padding:"6px 24px",
                    textDecoration:"none",
                    cursor:"pointer"
                }} 
                onClick={()=>{this.writeSnapshot(this.props.data, this.props.config)}}
            />
        )
    }

    configDifferWarningButton(snapshots){
        if(snapshots.length > 0 && snapshots[0].t && !snapshots[0].configMatch){
            return(
                <Modal inverted trigger={
                        <Button 
                            icon='warning' 
                            content="Config Differs from Last Snapshot" 
                            style={{
                                backgroundColor: "white", color:"black",
                                borderRadius:"6px", border:"1px solid #000000",
                                fontSize:"15px", fontWeight:"bold",
                                display:"inline-block",
                                float:"right",
                                padding:"6px 24px",
                                textDecoration:"none",
                                cursor:"pointer"
                            }}
                        />
                    }>
                    <Modal.Header>Snapshot Alert</Modal.Header>
                    <Modal.Content style={{backgroundColor:"black", color:"white"}}>
                        <span>We thought we&apos;d let you know your current optimization config differs. <br/>
                        Here they are below. If you&apos;re fine with this feel free to ignore.</span>
                        <Table inverted>
                            <Table.Header>
                                <Table.Row>
                                    <Table.HeaderCell>Current Config</Table.HeaderCell>
                                    <Table.HeaderCell>Last Snapshot Config</Table.HeaderCell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                <Table.Row>
                                    <Table.Cell><div><pre>{JSON.stringify(this.props.config,null,2)}</pre></div></Table.Cell>
                                    <Table.Cell><div><pre>{JSON.stringify(snapshots[0].c,null,2)}</pre></div></Table.Cell>
                                </Table.Row>
                            </Table.Body>
                        </Table>
                    </Modal.Content>
                </Modal>
            )
        }
        return ""
    }

    render() {
        let snapshots = this.readSnapshots(this.props.data.group)
        return (
            <Modal size={"fullscreen"} trigger={<Icon name='clone' />}>
                <Modal.Header>
                    Snapshots ({snapshots.length}) - {this.props.data.group}
                    {this.writeSnapshotButton()}
                    {this.configDifferWarningButton(snapshots)}
                </Modal.Header>
                <Modal.Content scrolling style={{height:"100%", padding: "0px"}}>
                    <div style={{overflow:"scroll", height:"100%", minHeight:"275px"}}>
                        <div style={{position:"absolute", height:"100%", zIndex:100}}>{
                            <SnapshotTable data={this.props.data} fetchSnapshots={this.props.fetchSnapshots} cloudOptimizeSnapshots={this.props.cloudOptimizeSnapshots}/>}
                        </div>
                        <div style={{display: "flex", paddingLeft:"415px"}}>
                            {snapshots.map((snapshot,i)=><SnapshotTable key={i} data={snapshot} fetchSnapshots={this.props.fetchSnapshots} cloudOptimizeSnapshots={this.props.cloudOptimizeSnapshots} />)}
                        </div>
                    </div>
                </Modal.Content>
            </Modal>
        )
    }
}