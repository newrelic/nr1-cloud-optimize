import React from 'react';
import { Card, Icon, Table, Button, Header } from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';
import awsIcon from '../../../../shared/images/awsIcon.png';
import aliIcon from '../../../../shared/images/alibabaIcon.png';
import gcpIcon from '../../../../shared/images/googleIcon.png';
import azIcon from '../../../../shared/images/azureIcon.png';
import vmwIcon from '../../../../shared/images/vmwareIcon.png';
import InstanceCandidates from './candidates';
import InstancePerformanceCard from './perf-card';

export default class InstanceCards extends React.PureComponent {
  render() {
    let { groups } = this.props;
    return (
      <DataConsumer>
        {({ costPeriod, selectedGroup, updateDataState }) => {
          groups = groups.filter(g =>
            selectedGroup ? g.name === selectedGroup : true
          );

          let groupData = null;
          return (
            <>
              <Card.Group centered={!selectedGroup}>
                {groups.map((g, i) => {
                  const aws = g.metrics.instances.amazon > 0;
                  const gcp = g.metrics.instances.google > 0;
                  const azu = g.metrics.instances.azure > 0;
                  const ali = g.metrics.instances.alibaba > 0;
                  const vmw = g.metrics.instances.vmware > 0;
                  const unknown = g.metrics.instances.unknown > 0;
                  const savingPerc = formatValue(
                    (g.metrics.instances.potentialSavings /
                      g.metrics.instances.currentSpend) *
                      100,
                    2
                  );

                  groupData = selectedGroup === g.name ? g : null;

                  const renderIcon = icon => (
                    <>
                      <img src={icon} height="25px" /> &nbsp;
                    </>
                  );

                  return (
                    <Card
                      key={i}
                      color="green"
                      style={{ width: g.name === selectedGroup ? '30%' : '' }}
                    >
                      <Card.Content>
                        <Card.Content>
                          <span style={{ fontSize: '13px' }}>
                            {g.name === 'undefined' ? 'Uncategorized' : g.name}
                          </span>
                        </Card.Content>
                      </Card.Content>
                      <Card.Content
                        style={{ paddingTop: '5px', paddingBottom: '5px' }}
                      >
                        <Table celled inverted={false} basic="very">
                          <Table.Header>
                            <Table.Row>
                              <Table.HeaderCell style={{ textAlign: 'left' }}>
                                {aws ? renderIcon(awsIcon) : ''}
                                {azu ? renderIcon(azIcon) : ''}
                                {gcp ? renderIcon(gcpIcon) : ''}
                                {ali ? renderIcon(aliIcon) : ''}
                                {vmw ? renderIcon(vmwIcon) : ''}
                                {unknown ? (
                                  <Icon name="server" size="large" />
                                ) : (
                                  ''
                                )}
                              </Table.HeaderCell>
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
                                    g.metrics.instances.currentSpend
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
                                    g.metrics.instances.optimizedSpend
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
                                    g.metrics.instances.potentialSavings
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
                        <span style={{ float: 'right' }}>
                          {isNaN(savingPerc) ? 0 : savingPerc}% Saving
                        </span>
                      </Card.Content>
                      <Card.Content
                        style={{ fontSize: '11px', textAlign: 'center' }}
                      >
                        <Button
                          size="mini"
                          color={
                            g.name === selectedGroup ? 'instagram' : 'twitter'
                          }
                          content={`${
                            g.name === selectedGroup ? 'Hide' : 'Show'
                          } Optimization Candidates`}
                          onClick={() =>
                            updateDataState({
                              selectedGroup:
                                g.name === selectedGroup ? null : g.name
                            })
                          }
                        />
                      </Card.Content>
                    </Card>
                  );
                })}
                {selectedGroup && groups.length === 1 ? (
                  <InstancePerformanceCard entities={groups[0].entities} />
                ) : (
                  ''
                )}
              </Card.Group>
              {selectedGroup && groupData ? (
                <InstanceCandidates group={groupData} />
              ) : (
                ''
              )}
              {selectedGroup && !groupData ? (
                <Header as="h3" style={{ paddingTop: '10px' }}>
                  No data, check your tag filters.
                </Header>
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
