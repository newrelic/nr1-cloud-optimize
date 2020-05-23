import React from 'react';
import { Card, Icon, Button, Segment } from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';
import { getIcon } from '../../../strategies/entity-handler';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  navigation
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
          const getData = (type, item, attr) => {
            let data = null;
            switch (type) {
              case 'system': {
                data =
                  item.systemSample ||
                  item.vsphereVmSample ||
                  item.vsphereHostSample;
                break;
              }
              default:
                data = type ? item[type] : item;
            }

            if (data) {
              if (attr) {
                return data[attr] || '-';
              } else {
                return data;
              }
            }

            return null;
          };

          const tableHdrCell = (name, type, attr, order) => (
            <TableHeaderCell
              value={({ item }) => getData(type, item, attr)}
              sortable
              sortingType={this.state[attr]}
              sortingOrder={order}
              onClick={(e, d) => this.onClickTableHeaderCell(attr, e, d)}
            >
              {name}
            </TableHeaderCell>
          );

          const renderRowCell = (v, guid, cost) => (
            <TableRowCell
              onClick={guid ? () => navigation.openStackedEntity(guid) : null}
              style={{
                fontSize: '12px',
                cursor: guid ? 'pointer' : '',
                color: guid ? 'rgb(0, 121, 191)' : ''
              }}
            >
              {cost && !isNaN(v) ? adjustCost(costPeriod, v) : v}
            </TableRowCell>
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
                    value={({ item }) => item.cloud}
                    sortable
                    sortingType={this.state.cloud}
                    sortingOrder={0}
                    onClick={(e, d) =>
                      this.onClickTableHeaderCell('cloud', e, d)
                    }
                    width="50px"
                  />

                  <TableHeaderCell
                    value={({ item }) => item.name}
                    sortable
                    sortingType={this.state.name}
                    sortingOrder={1}
                    onClick={(e, d) =>
                      this.onClickTableHeaderCell('name', e, d)
                    }
                    width="25%"
                  >
                    Name
                  </TableHeaderCell>
                  {tableHdrCell('Max Cpu %', 'system', 'max.cpuPercent', 2)}
                  {tableHdrCell('Max Mem %', 'system', 'max.memoryPercent', 3)}
                  {tableHdrCell(
                    'Max Tx',
                    'system',
                    'max.transmitBytesPerSecond',
                    4
                  )}
                  {tableHdrCell(
                    'Max Rx',
                    'system',
                    'max.receiveBytesPerSecond',
                    5
                  )}
                  {tableHdrCell('Num Cpu', null, 'coreCount', 6)}
                  {tableHdrCell('Mem Gb', null, 'memoryGb', 7)}
                  {tableHdrCell(
                    'Instance Type',
                    'instanceResult',
                    'instanceType',
                    8
                  )}
                  {tableHdrCell('Price', 'instanceResult', 'onDemandPrice', 9)}
                </TableHeader>

                {({ item }) => {
                  const s = getData('system', item);
                  const metric = attr => (s[attr] ? s[attr].toFixed(2) : '-');
                  const instance = attr =>
                    item.instanceResult ? item.instanceResult[attr] : '-';
                  const icon = getIcon(item);
                  return (
                    <TableRow>
                      {renderRowCell(
                        icon ? (
                          <img src={icon} height="25px" />
                        ) : (
                          <>
                            &nbsp;
                            <Icon name="server" size="large" />
                          </>
                        )
                      )}
                      {renderRowCell(
                        // <a
                        //   onClick={() =>
                        //     navigation.openStackedEntity(item.guid)
                        //   }
                        // >
                        item.name,
                        item.guid
                        // </a>
                      )}
                      {renderRowCell(metric('max.cpuPercent'))}
                      {renderRowCell(metric('max.memoryPercent'))}
                      {renderRowCell(metric('max.transmitBytesPerSecond'))}
                      {renderRowCell(metric('max.receiveBytesPerSecond'))}
                      {renderRowCell(item.coreCount)}
                      {renderRowCell(item.memoryGb.toFixed(2))}
                      {renderRowCell(instance('type'))}
                      {renderRowCell(instance('onDemandPrice'), null, true)}
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
