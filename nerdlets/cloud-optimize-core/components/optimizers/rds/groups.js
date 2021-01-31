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
        {({ rulesCpu, rulesConnections, rulesStorageUsage }) => {
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
                  const datastoreSample =
                    (((e || {}).datastoreSample || {}).results || {})[0] || {};

                  const row = {
                    name: e.name,
                    guid: datastoreSample['latest.entityGuid'],
                    cpu: datastoreSample['max.provider.cpuUtilization.Average'],
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
                    allocatedStorageBytes:
                      datastoreSample['latest.provider.allocatedStorageBytes'],
                    storageUsedPercent: 0,
                    readIops: datastoreSample['max.provider.readIops.Average'],
                    writeIops:
                      datastoreSample['max.provider.writeIops.Average'],
                    passing: 'TRUE',
                    failures: []
                  };

                  row.storageUsedPercent =
                    ((row.allocatedStorageBytes - row.freeStorageBytes) /
                      row.allocatedStorageBytes) *
                    100;

                  // check rules

                  // cpu
                  if (rulesCpu !== 0 && row.cpu < rulesCpu) {
                    row.failures.push(
                      `Low CPU ${row.cpu.toFixed(2)} < ${rulesCpu}`
                    );
                  }

                  // storage
                  if (
                    rulesStorageUsage !== 0 &&
                    row.storageUsedPercent < rulesStorageUsage
                  ) {
                    row.failures.push(
                      `Low Storage Usage ${row.storageUsedPercent.toFixed(
                        2
                      )} < ${rulesStorageUsage}`
                    );
                  }

                  // connections
                  if (
                    rulesConnections !== 0 &&
                    row.databaseConnections < rulesConnections
                  ) {
                    row.failures.push(
                      `Low Connections ${row.databaseConnections} < ${rulesConnections}`
                    );
                  }

                  if (row.failures.length > 0) {
                    row.passing = 'FALSE';
                  }

                  return row;
                });

                const tableHdrCell = (name, type, attr, order) => (
                  <TableHeaderCell
                    value={({ item }) => item[name]}
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
                    value={value}
                  />
                );

                return (
                  <Card key={g.name} style={{ width: '100%' }}>
                    <Card.Content>
                      <Card.Header>{g.name}</Card.Header>

                      <Table
                        items={tableData}
                        onSelect={(evt, { item }) =>
                          (item.selected = evt.target.checked)
                        }
                      >
                        <TableHeader>
                          {tableHdrCell('Name', null, 'name')}
                          {tableHdrCell(
                            'Connections',
                            null,
                            'databaseConnections',
                            1
                          )}
                          {tableHdrCell('CPU', null, 'cpu', 2)}

                          {tableHdrCell(
                            'Storage Used',
                            null,
                            'storageUsedPercent',
                            3
                          )}
                          {tableHdrCell(
                            'Freeable Memory MB',
                            null,
                            'freeableMemory',
                            4
                          )}
                          {tableHdrCell('Read IOPS', null, 'readIops', 5)}
                          {tableHdrCell('Write IOPS', null, 'writeIops', 6)}

                          {tableHdrCell('Rules Passing', null, 'passing', 0)}
                        </TableHeader>

                        {({ item }) => (
                          <TableRow style={{ backgroundColor: 'red' }}>
                            {renderRowCell(item.name, item.guid)}
                            {renderRowCell(item.databaseConnections)}

                            {renderMetricRowCell(
                              MetricTableRowCell.TYPE.UNKNOWN,
                              parseFloat(item.cpu.toFixed(2))
                            )}

                            {renderMetricRowCell(
                              MetricTableRowCell.TYPE.UNKNOWN,
                              parseFloat(item.storageUsedPercent.toFixed(2))
                            )}

                            {renderMetricRowCell(
                              MetricTableRowCell.TYPE.BYTES,
                              item.freeableMemory
                            )}

                            {renderMetricRowCell(
                              MetricTableRowCell.TYPE.UNKNOWN,
                              item.readIops
                            )}

                            {renderMetricRowCell(
                              MetricTableRowCell.TYPE.UNKNOWN,
                              item.writeIops
                            )}

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
