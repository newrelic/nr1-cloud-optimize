import React from 'react';
import { Card, Table, Icon, Button as SemanticButton } from 'semantic-ui-react';
import { Modal, HeadingText, BlockText, Button } from 'nr1';
import InstanceCandidates from './candidates';
import { DataConsumer } from '../../../context/data';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';
import ExtendedMetrics from './extended-metrics';

export default class Cards extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { hidden: true, failures: [], selectedEntities: [] };
  }

  onClickTableHeaderCell = (key, event, sortingData) => {
    this.setState({ [key]: sortingData.nextSortingType });
  };

  onClose = () => {
    this.setState({ hidden: true });
  };

  render() {
    let { groups } = this.props;

    return (
      <DataConsumer>
        {({ selectedGroup, updateDataState, costPeriod }) => {
          groups = groups.filter(g =>
            selectedGroup ? g.name === selectedGroup : true
          );

          return (
            <>
              {/* render single modal for better perf */}
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

              <Card.Group centered>
                {groups.map((g, i) => {
                  const tableData = g.entities.map(e => {
                    const datastoreSample = e.datastoreSample;

                    const row = {
                      name: e.name,
                      guid: datastoreSample['latest.entityGuid'],
                      cpu:
                        datastoreSample[
                          'max.provider.cpuUtilization.Average'
                        ] || 0,
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
                        datastoreSample[
                          'latest.provider.allocatedStorageBytes'
                        ],
                      storageUsage: datastoreSample.storageUsage,
                      readIops:
                        datastoreSample['max.provider.readIops.Average'],
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
                      storageType:
                        datastoreSample['latest.provider.storageType'],
                      passing: 'TRUE',
                      failures: e.failures,
                      memory: datastoreSample.memory,
                      vcpu: datastoreSample.vcpu,
                      price: datastoreSample.price,
                      suggestedType: e.suggestedType,
                      suggestedPrice: e.suggestedPrice,
                      potentialSavings: e.potentialSavings,
                      isStale: e.isStale || false,
                      noFailures: e.failures.length
                    };

                    if (row.failures.length > 0) {
                      row.passing = 'FALSE';
                    }

                    return row;
                  });

                  return (
                    <Card
                      key={i}
                      color="green"
                      style={{
                        width: g.name === selectedGroup ? '31%' : ''
                      }}
                    >
                      <Card.Content>
                        <Card.Content
                          style={{
                            width: g.name === selectedGroup ? '31%' : '',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          <span
                            style={{
                              fontSize: '13px'
                            }}
                          >
                            {g.name === 'undefined' ? 'Uncategorized' : g.name}
                          </span>
                        </Card.Content>
                      </Card.Content>
                      <Card.Content
                        style={{ paddingTop: '5px', paddingBottom: '5px' }}
                      >
                        <Table
                          celled
                          inverted={false}
                          basic="very"
                          aria-label=""
                        >
                          <Table.Header>
                            <Table.Row>
                              <Table.HeaderCell style={{ textAlign: 'left' }} />
                              <Table.HeaderCell style={{ textAlign: 'right' }}>
                                Price {costPeriod.label}
                              </Table.HeaderCell>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body style={{ fontSize: '13px' }}>
                            <Table.Row>
                              <Table.Cell>Current Spend</Table.Cell>
                              <Table.Cell style={{ textAlign: 'right' }}>
                                $
                                {formatValue(
                                  adjustCost(
                                    costPeriod,
                                    g.metricTotals.currentSpend
                                  ),
                                  2
                                )}
                              </Table.Cell>
                            </Table.Row>
                            <Table.Row>
                              <Table.Cell>Optimized Spend</Table.Cell>
                              <Table.Cell style={{ textAlign: 'right' }}>
                                $
                                {formatValue(
                                  adjustCost(
                                    costPeriod,
                                    g.metricTotals.estimatedNewSpend
                                  ),
                                  2
                                )}
                              </Table.Cell>
                            </Table.Row>
                            <Table.Row positive>
                              <Table.Cell positive>
                                Potential Savings
                              </Table.Cell>
                              <Table.Cell
                                positive
                                style={{ textAlign: 'right' }}
                              >
                                $
                                {formatValue(
                                  adjustCost(
                                    costPeriod,
                                    g.metricTotals.potentialSavings
                                  ),
                                  2
                                )}
                              </Table.Cell>
                            </Table.Row>
                          </Table.Body>
                        </Table>
                      </Card.Content>
                      <Card.Content extra>
                        <span>
                          <Icon name="cubes" />
                          {g.entities.length}{' '}
                          {g.entities.length === 1 ? 'Entity' : 'Entities'}
                        </span>{' '}
                        {/* <span style={{ float: 'right' }}>
                          {isNaN(savingPerc) ? 0 : savingPerc}% Saving
                        </span> */}
                      </Card.Content>
                      <Card.Content
                        style={{ fontSize: '11px', textAlign: 'center' }}
                      >
                        <SemanticButton
                          size="mini"
                          color={
                            g.name === selectedGroup ? 'instagram' : 'twitter'
                          }
                          content={`${
                            g.name === selectedGroup ? 'Hide' : 'Show'
                          } Optimization Candidates`}
                          onClick={() => {
                            updateDataState({
                              selectedGroup:
                                g.name === selectedGroup ? null : g.name
                            });
                            this.setState({
                              selectedTableData: tableData,
                              selectedEntities: g.entities
                            });
                          }}
                        />
                      </Card.Content>
                    </Card>

                    // <Card key={g.name} style={{ width: '100%' }}>
                    //   <Card.Content>
                    //     <Card.Header>{g.name}</Card.Header>

                    //   </Card.Content>
                    // </Card>
                  );
                })}

                {selectedGroup && groups.length === 1 ? (
                  <>
                    <ExtendedMetrics entities={this.state.selectedEntities} />
                  </>
                ) : (
                  ''
                )}
              </Card.Group>

              {selectedGroup ? (
                <>
                  <br />
                  <InstanceCandidates
                    tableData={this.state.selectedTableData}
                    setFailures={state => this.setState(state)}
                  />
                </>
              ) : (
                ''
              )}
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
