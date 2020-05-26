import React from 'react';
import { Icon, Segment } from 'semantic-ui-react';
import { DataConsumer, categoryTypes } from '../../../context/data';
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
        {({ costPeriod }) => {
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

          const getOptimizedData = (item, attr) => {
            let v = '-';
            if (item.optimizedData) {
              if (
                item.optimizedData.state &&
                !item.optimizedData.state.includes('optimize')
              ) {
                return item.optimizedData.state;
              }

              if (item.optimizedData.dcResult) {
                v = item.optimizedData.dcResult[attr] || '-';
              }
            }

            if (item.optimizedResult) {
              v = item.optimizedResult[attr] || '-';
            }

            return v;
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

          const renderOptimizeRowHdrCell = (name, attr, order) => {
            return (
              <TableHeaderCell
                value={({ item }) => getOptimizedData(item, attr)}
                sortable
                sortingType={this.state[`optimize_${attr}`]}
                sortingOrder={order}
                onClick={(e, d) =>
                  this.onClickTableHeaderCell(`optimize_${attr}`, e, d)
                }
              >
                {name}
              </TableHeaderCell>
            );
          };

          const renderRowCell = (v, guid, cost) => (
            <TableRowCell
              onClick={guid ? () => navigation.openStackedEntity(guid) : null}
              style={{
                fontSize: '12px',
                cursor: guid ? 'pointer' : '',
                color: guid ? 'rgb(0, 121, 191)' : ''
              }}
            >
              {cost && !isNaN(v)
                ? formatValue(adjustCost(costPeriod, v), 2)
                : v}
            </TableRowCell>
          );

          return (
            <Segment raised>
              {group.entities.length > 0 ? (
                <Table
                  items={group.entities.filter(e =>
                    categoryTypes.instances.includes(e.type)
                  )}
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
                      style={{ paddingLeft: '10px' }}
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
                      width="250px"
                    >
                      Name
                    </TableHeaderCell>
                    {tableHdrCell(
                      'Max Cpu Percent',
                      'system',
                      'max.cpuPercent',
                      2
                    )}
                    {tableHdrCell(
                      'Max Mem Percent',
                      'system',
                      'max.memoryPercent',
                      3
                    )}
                    {tableHdrCell(
                      'Max Tx Bytes Per Second',
                      'system',
                      'max.transmitBytesPerSecond',
                      4
                    )}
                    {tableHdrCell(
                      'Max Rx Bytes Per Second',
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
                    {tableHdrCell(
                      'Price',
                      'instanceResult',
                      'onDemandPrice',
                      9
                    )}
                    {renderOptimizeRowHdrCell(
                      'Suggested Instance Type',
                      'type',
                      10
                    )}
                    {renderOptimizeRowHdrCell(
                      'Suggested Price',
                      'onDemandPrice',
                      11
                    )}
                    {tableHdrCell('Savings', null, 'potentialSavings', 12)}
                    {tableHdrCell(
                      'Savings w/Spot',
                      null,
                      'potentialSavingsWithSpot',
                      12
                    )}
                  </TableHeader>

                  {({ item }) => {
                    const s = getData('system', item);
                    const metric = attr =>
                      s && s[attr] ? s[attr].toFixed(2) : '-';
                    const instance = attr =>
                      item.instanceResult ? item.instanceResult[attr] : '-';
                    const icon = getIcon(item);

                    return (
                      <TableRow>
                        {renderRowCell(
                          icon ? (
                            <img
                              src={icon}
                              height="25px"
                              style={{ paddingLeft: '10px' }}
                            />
                          ) : (
                            <>
                              <Icon
                                name="server"
                                size="large"
                                style={{ paddingLeft: '10px' }}
                              />
                            </>
                          )
                        )}
                        {renderRowCell(item.name, item.guid)}
                        {renderRowCell(metric('max.cpuPercent'))}
                        {renderRowCell(metric('max.memoryPercent'))}
                        {renderRowCell(metric('max.transmitBytesPerSecond'))}
                        {renderRowCell(metric('max.receiveBytesPerSecond'))}
                        {renderRowCell(item.coreCount)}
                        {renderRowCell((item.memoryGb || 0).toFixed(2))}
                        {renderRowCell(instance('type'))}
                        {renderRowCell(
                          item.cloud
                            ? instance('onDemandPrice')
                            : item.currentSpend || '-',
                          null,
                          true
                        )}
                        {renderRowCell(
                          getOptimizedData(item, 'type'),
                          null,
                          true
                        )}
                        {renderRowCell(
                          getOptimizedData(item, 'onDemandPrice'),
                          null,
                          true
                        )}
                        {renderRowCell(
                          item.potentialSavings || '-',
                          null,
                          true
                        )}
                        {renderRowCell(
                          item.potentialSavingsWithSpot || '-',
                          null,
                          true
                        )}
                      </TableRow>
                    );
                  }}
                </Table>
              ) : (
                'No entities, check your tag filters.'
              )}
            </Segment>
          );
        }}
      </DataConsumer>
    );
  }
}
