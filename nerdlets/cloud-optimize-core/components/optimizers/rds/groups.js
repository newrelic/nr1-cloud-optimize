import React from 'react';
import { Card, Header } from 'semantic-ui-react';
import {
  navigation,
  Table,
  TableRow,
  TableRowCell,
  TableHeader,
  TableHeaderCell,
  MetricTableRowCell,
  Modal,
  HeadingText,
  BlockText,
  Button
} from 'nr1';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';
import { RdsConsumer } from './context';

export default class Groups extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { hidden: true, failures: [] };
  }

  onClickTableHeaderCell = (key, event, sortingData) => {
    this.setState({ [key]: sortingData.nextSortingType });
  };

  onClose = () => {
    this.setState({ hidden: true });
  };

  render() {
    const { groups, costPeriod } = this.props;

    return (
      <RdsConsumer>
        {({ rules }) => {
          return (
            <>
              <Modal hidden={this.state.hidden} onClose={this.onClose}>
                <HeadingText type={HeadingText.TYPE.HEADING_1}>
                  Failing Rules
                </HeadingText>
                <BlockText type={BlockText.TYPE.PARAGRAPH}>
                  {this.state.failures.map((f, i) => {
                    return (
                      <React.Fragment key={i}>
                        {f}
                        <br />
                      </React.Fragment>
                    );
                  })}
                </BlockText>
                <Button onClick={this.onClose}>Close</Button>
              </Modal>

              <Header as="h4" content="Groups" />
              {groups.map(g => {
                const tableData = g.entities.map(e => {
                  const datastoreSample = e.datastoreSample;

                  const row = {
                    name: e.name,
                    guid: datastoreSample['latest.entityGuid'],
                    cpu:
                      datastoreSample['max.provider.cpuUtilization.Average'] ||
                      0,
                    freeableMemory:
                      datastoreSample['max.provider.freeableMemory.Average'],
                    databaseConnections:
                      datastoreSample[
                        'max.provider.databaseConnections.Average'
                      ],
                    freeStorageBytes:
                      datastoreSample[
                        'latest.provider.freeStorageSpaceBytes.Average'
                      ],
                    memoryUsage: datastoreSample.memoryUsage,
                    allocatedStorageBytes:
                      datastoreSample['latest.provider.allocatedStorageBytes'],
                    storageUsage: datastoreSample.storageUsage,
                    readIops: datastoreSample['max.provider.readIops.Average'],
                    writeIops:
                      datastoreSample['max.provider.writeIops.Average'],
                    tx:
                      datastoreSample[
                        'max.provider.networkTransmitThroughput.Average'
                      ],
                    rx:
                      datastoreSample[
                        'max.provider.networkReceiveThroughput.Average'
                      ],
                    type: datastoreSample['latest.provider.dbInstanceClass'],
                    region: datastoreSample['latest.awsRegion'],
                    storageType: datastoreSample['latest.provider.storageType'],
                    passing: 'TRUE',
                    failures: [],
                    memory: datastoreSample.memory,
                    vcpu: datastoreSample.vcpu,
                    price: datastoreSample.price,
                    suggestedType: e.suggestedType,
                    suggestedPrice: e.suggestedPrice,
                    potentialSavings: e.potentialSavings
                  };

                  // check rules

                  // cpu
                  if (rules.cpu !== 0 && row.cpu < rules.cpu) {
                    row.failures.push(
                      `Low CPU ${(row.cpu || 0).toFixed(2)} < ${rules.cpu}`
                    );
                  }

                  // storage
                  if (
                    rules.storageUsage !== 0 &&
                    row.storageUsage < rules.storageUsage
                  ) {
                    row.failures.push(
                      `Low Storage Usage ${(row.storageUsage || 0).toFixed(
                        2
                      )} < ${rules.storageUsage}`
                    );
                  }

                  // connections
                  if (
                    rules.connections !== 0 &&
                    row.databaseConnections < rules.connections
                  ) {
                    row.failures.push(
                      `Low Connections ${row.databaseConnections} < ${rules.connections}`
                    );
                  }

                  if (row.failures.length > 0) {
                    row.passing = 'FALSE';
                  }

                  return row;
                });

                const tableHdrCell = (name, type, attr, order) => (
                  <TableHeaderCell
                    value={({ item }) => item[attr]}
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
                    onClick={
                      guid
                        ? () => navigation.openStackedEntity(guid)
                        : undefined
                    }
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

                const renderMetricRowCell = (type, value) => (
                  <MetricTableRowCell
                    style={{
                      fontSize: '12px'
                    }}
                    type={type}
                    value={value || 0}
                  />
                );

                return (
                  <Card key={g.name} style={{ width: '100%' }}>
                    <Card.Content>
                      <Card.Header>{g.name}</Card.Header>

                      <Table items={tableData}>
                        <TableHeader>
                          {tableHdrCell('Name', null, 'name', 0)}

                          {tableHdrCell(
                            'Connections',
                            null,
                            'databaseConnections',
                            1
                          )}

                          {tableHdrCell('CPU %', null, 'cpu', 2)}

                          {tableHdrCell('Memory %', null, 'memoryUsage', 3)}

                          {tableHdrCell(
                            'Storage Used',
                            null,
                            'storageUsage',
                            4
                          )}

                          {tableHdrCell('TX', null, 'tx', 5)}

                          {tableHdrCell('RX', null, 'rx', 6)}
                          {/* 
                          {tableHdrCell('Read IOPS', null, 'readIops', 7)}

                          {tableHdrCell('Write IOPS', null, 'writeIops', 8)} */}

                          {tableHdrCell('VCPU', null, 'vcpu', 9)}

                          {tableHdrCell('Memory', null, 'memory', 10)}

                          {tableHdrCell('Type', null, 'type', 11)}

                          {tableHdrCell('Region', null, 'region', 12)}

                          {tableHdrCell('Price', null, 'price', 13)}

                          {tableHdrCell(
                            'Suggested Type',
                            null,
                            'suggestedType',
                            14
                          )}

                          {tableHdrCell(
                            'Suggested Price',
                            null,
                            'suggestedPrice',
                            15
                          )}

                          {tableHdrCell(
                            'Potential Savings',
                            null,
                            'potentialSavings',
                            16
                          )}

                          {tableHdrCell('Rules Passing', null, 'passing', 17)}
                        </TableHeader>

                        {({ item }) => (
                          <TableRow style={{ backgroundColor: 'red' }}>
                            {renderRowCell(item.name, item.guid)}
                            {renderRowCell(item.databaseConnections)}
                            {item.cpu
                              ? renderMetricRowCell(
                                  MetricTableRowCell.TYPE.UNKNOWN,
                                  parseFloat(item.cpu.toFixed(2))
                                )
                              : renderRowCell('')}
                            {item.memoryUsage
                              ? renderMetricRowCell(
                                  MetricTableRowCell.TYPE.UNKNOWN,
                                  parseFloat((item.memoryUsage || 0).toFixed(2))
                                )
                              : renderRowCell('')}
                            {item.storageUsage
                              ? renderMetricRowCell(
                                  MetricTableRowCell.TYPE.UNKNOWN,
                                  parseFloat(item.storageUsage.toFixed(2))
                                )
                              : renderRowCell('')}
                            {renderMetricRowCell(
                              MetricTableRowCell.TYPE.UNKNOWN,
                              item.tx
                            )}
                            {renderMetricRowCell(
                              MetricTableRowCell.TYPE.UNKNOWN,
                              item.rx
                            )}
                            {/* {renderMetricRowCell(
                              MetricTableRowCell.TYPE.UNKNOWN,
                              item.readIops
                            )}
                            {renderMetricRowCell(
                              MetricTableRowCell.TYPE.UNKNOWN,
                              item.writeIops
                            )} */}
                            {renderRowCell(item.vcpu)}
                            {renderRowCell(item.memory)}
                            {renderRowCell(item.type)}
                            {renderRowCell(item.region)}
                            {renderRowCell(item.price)}

                            {renderRowCell(item.suggestedType)}
                            {renderRowCell(item.suggestedPrice)}
                            {renderRowCell(item.potentialSavings)}

                            <TableRowCell
                              style={{
                                fontSize: '12px',
                                color:
                                  item.passing === 'FALSE' ? 'red' : 'green',
                                fontWeight: 'bold',
                                cursor:
                                  item.passing === 'FALSE' ? 'pointer' : 'none'
                              }}
                              onClick={() =>
                                item.passing === 'FALSE'
                                  ? this.setState({
                                      hidden: false,
                                      failures: item.failures
                                    })
                                  : undefined
                              }
                            >
                              {item.passing}{' '}
                              {item.passing === 'FALSE'
                                ? ` (${item.failures.length})`
                                : ''}
                            </TableRowCell>
                          </TableRow>
                        )}
                      </Table>
                    </Card.Content>
                  </Card>
                );
              })}
            </>
          );
        }}
      </RdsConsumer>
    );
  }
}
