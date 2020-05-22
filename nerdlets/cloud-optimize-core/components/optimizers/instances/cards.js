import React from 'react';
import { Card, Icon, Table } from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';
import awsIcon from '../../../../shared/images/awsIcon.png';
import aliIcon from '../../../../shared/images/alibabaIcon.png';
import gcpIcon from '../../../../shared/images/googleIcon.png';
import azIcon from '../../../../shared/images/azureIcon.png';

export default class InstanceCards extends React.PureComponent {
  render() {
    const { groups } = this.props;
    return (
      <DataConsumer>
        {({ costPeriod }) => {
          return (
            <Card.Group centered>
              {groups.map((g, i) => {
                const aws = g.costs.instances.amazon > 0;
                const gcp = g.costs.instances.google > 0;
                const azure = g.costs.instances.azure > 0;
                const ali = g.costs.instances.alibaba > 0;
                const unknown = g.costs.instances.unknown > 0;
                const savingPerc = formatValue(
                  (g.costs.instances.potentialSavings /
                    g.costs.instances.currentSpend) *
                    100,
                  2
                );

                return (
                  <Card key={i} color="green">
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
                              {aws ? <img src={awsIcon} height="25px" /> : ''}
                              &nbsp;
                              {azure ? <img src={azIcon} height="25px" /> : ''}
                              &nbsp;
                              {ali ? <img src={aliIcon} height="25px" /> : ''}
                              &nbsp;
                              {gcp ? <img src={gcpIcon} height="25px" /> : ''}
                              &nbsp;
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
                                  g.costs.instances.currentSpend
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
                                  g.costs.instances.optimizedSpend
                                ),
                                2
                              )}
                            </Table.Cell>
                          </Table.Row>
                          <Table.Row positive>
                            <Table.Cell positive>Potential Savings</Table.Cell>
                            <Table.Cell positive style={{ textAlign: 'right' }}>
                              $
                              {formatValue(
                                adjustCost(
                                  costPeriod,
                                  g.costs.instances.potentialSavings
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
                        {' '}
                        {savingPerc}% Saving
                      </span>
                    </Card.Content>
                    <Card.Content
                      style={{ fontSize: '11px', textAlign: 'right' }}
                    >
                      Show Optimization Candidates
                    </Card.Content>
                  </Card>
                );
              })}
            </Card.Group>
          );
        }}
      </DataConsumer>
    );
  }
}
