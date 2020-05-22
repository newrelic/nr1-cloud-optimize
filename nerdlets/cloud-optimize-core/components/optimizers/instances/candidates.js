import React from 'react';
import { Card, Icon, Button, Segment } from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';
import awsIcon from '../../../../shared/images/awsIcon.png';
import aliIcon from '../../../../shared/images/alibabaIcon.png';
import gcpIcon from '../../../../shared/images/googleIcon.png';
import azIcon from '../../../../shared/images/azureIcon.png';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell
} from 'nr1';

export default class InstanceCandidates extends React.PureComponent {
  render() {
    const { group } = this.props;
    return (
      <DataConsumer>
        {({ costPeriod, selectedGroup, updateDataState }) => {
          console.log(group);
          return (
            <Segment raised>
              <Table
                items={group.entities}
                //   selected={({ item }) => item.selected}
                //   onSelect={(evt, { item }) => (item.selected = evt.target.checked)}
              >
                <TableHeader>
                  <TableHeaderCell value={({ item }) => item.name} width="50%">
                    Name
                  </TableHeaderCell>
                  <TableHeaderCell value={({ item }) => item.gender}>
                    Max cpu %
                  </TableHeaderCell>
                  <TableHeaderCell value={({ item }) => item.company}>
                    Max mem %
                  </TableHeaderCell>
                </TableHeader>

                {({ item }) => {
                  const sample =
                    item.systemSample ||
                    item.vsphereVmSample ||
                    item.vsphereHostSample;
                  return (
                    <TableRow>
                      <TableRowCell style={{ fontSize: '11px' }}>
                        {item.name}
                      </TableRowCell>
                      <TableRowCell>
                        {sample['max.cpuPercent'].toFixed(2) || '-'}
                      </TableRowCell>
                      <TableRowCell>
                        {sample['max.memoryPercent'].toFixed(2) || '-'}
                      </TableRowCell>
                    </TableRow>
                  );
                }}
              </Table>
            </Segment>
          );
        }}
      </DataConsumer>
    );
  }
}
