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
  constructor(props) {
    super(props);
    this.state = {};
  }

  onClickTableHeaderCell = (key, event, sortingData) => {
    this.setState({ [key]: sortingData.nextSortingType });
  };

  render() {
    const { group } = this.props;
    return (
      <DataConsumer>
        {({ costPeriod, selectedGroup, updateDataState }) => {
          const getSample = (type, item) => {
            switch (type) {
              case 'system': {
                const sample =
                  item.systemSample ||
                  item.vsphereVmSample ||
                  item.vsphereHostSample;
                return sample;
              }
              default: {
                if (type) {
                  return item[type];
                }
                return item;
              }
            }
          };

          const renderTableHeaderCell = (name, type, attr, order) => (
            <TableHeaderCell
              value={({ item }) => getSample(type, item)[attr]}
              sortable
              sortingType={this.state[attr]}
              sortingOrder={order}
              onClick={(e, d) => this.onClickTableHeaderCell(attr, e, d)}
            >
              {name}
            </TableHeaderCell>
          );

          const renderRowCell = text => (
            <TableRowCell style={{ fontSize: '12px' }}>{text}</TableRowCell>
          );

          console.log(group);
          return (
            <Segment raised>
              <Table
                items={group.entities}
                //   selected={({ item }) => item.selected}
                //   onSelect={(evt, { item }) => (item.selected = evt.target.checked)}
              >
                <TableHeader>
                  <TableHeaderCell
                    value={({ item }) => item.name}
                    sortable
                    sortingType={this.state.name}
                    sortingOrder={0}
                    onClick={(e, d) =>
                      this.onClickTableHeaderCell('name', e, d)
                    }
                    width="25%"
                  >
                    Name
                  </TableHeaderCell>
                  {renderTableHeaderCell(
                    'Max cpu %',
                    'system',
                    'max.cpuPercent',
                    1
                  )}
                  {renderTableHeaderCell(
                    'Max mem %',
                    'system',
                    'max.memoryPercent',
                    2
                  )}
                  {renderTableHeaderCell(
                    'Max tx',
                    'system',
                    'max.transmitBytesPerSecond',
                    3
                  )}
                  {renderTableHeaderCell(
                    'Max rx',
                    'system',
                    'max.receiveBytesPerSecond',
                    4
                  )}
                  {renderTableHeaderCell('num cpu', null, 'coreCount', 5)}
                  {renderTableHeaderCell('mem gb', null, 'memoryGb', 6)}
                </TableHeader>

                {({ item }) => {
                  const s = getSample('system', item);
                  const metric = attr => (s[attr] ? s[attr].toFixed(2) : '-');
                  return (
                    <TableRow>
                      {renderRowCell(item.name)}
                      {renderRowCell(metric('max.cpuPercent'))}
                      {renderRowCell(metric('max.memoryPercent'))}
                      {renderRowCell(metric('max.transmitBytesPerSecond'))}
                      {renderRowCell(metric('max.receiveBytesPerSecond'))}
                      {renderRowCell(item.coreCount)}
                      {renderRowCell(item.memoryGb.toFixed(2))}
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
