import React from 'react';
import { Card, Icon, Table } from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';

export default class InstanceCards extends React.PureComponent {
  render() {
    const { groups } = this.props;
    return (
      <DataConsumer>
        {({ costPeriod }) => {
          return (
            <Card.Group centered>
              {groups.map((g, i) => {
                console.log(g);
                return (
                  <Card key={i}>
                    <Card.Content>
                      <Card.Header>
                        {g.name === 'undefined' ? 'Uncategorized' : g.name}
                      </Card.Header>
                      {/* <Card.Description>
                      Matthew is a musician living in Nashville.
                    </Card.Description> */}
                    </Card.Content>
                    <Card.Content
                      style={{ paddingTop: '5px', paddingBottom: '5px' }}
                    >
                      <Table celled inverted={false} basic="very">
                        <Table.Header>
                          <Table.Row>
                            <Table.HeaderCell />
                            <Table.HeaderCell style={{ textAlign: 'right' }}>
                              Price {costPeriod.label}
                            </Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
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
                      <a>
                        <Icon name="cubes" />
                        {g.entities.length} Entities
                      </a>{' '}
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
