import React from 'react';
import { Table, Header, Divider, Icon } from 'semantic-ui-react';
import AddCost from './add-cost';
import { DataConsumer } from '../../context/data';
import { writeEntityDocument, formatValue } from '../../../shared/lib/utils';
import { nrTableHeaderCell } from '../../css/style';

const costTables = [
  'Server',
  'Rack Infrastructure',
  'Software',
  'Storage',
  'Network',
  'Facilities',
  'Labor',
  'Miscellaneous'
];

export default class CostTables extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { deleting: false };
  }

  deleteCost = (getWorkloadDocs, guid, doc, costType, index) => {
    this.setState({ deleting: true }, async () => {
      doc.costs[costType].splice(index, 1);
      await writeEntityDocument(guid, 'dcDoc', 'dcDoc', doc);
      getWorkloadDocs(guid);
      this.setState({ deleting: false });
    });
  };

  render() {
    const { deleting } = this.state;
    const { dc, guid, doc, costs, costTotal, selectedWorkload } = this.props;

    return (
      <DataConsumer>
        {({ getWorkloadDocs }) => {
          const estimatedCU =
            costTotal.value === 0 || dc.totalCU === 0
              ? 0
              : (costTotal.value || 0) / 8760 / dc.totalCU;
          return (
            <>
              <Header as="h3" style={{ paddingTop: '5px' }}>
                {selectedWorkload.replace('Datacenter:', '')}: Cost Summary
                Assumptions
              </Header>

              {/* Hours in a year === 8766 */}

              <Table basic="very" celled collapsing>
                <Table.Body>
                  <Table.Row>
                    <Table.Cell>Estimated Total</Table.Cell>
                    <Table.Cell>
                      ${formatValue(costTotal.value || 0, 2)} /year
                    </Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell>Estimated CU</Table.Cell>
                    <Table.Cell>${formatValue(estimatedCU)} /hour</Table.Cell>
                  </Table.Row>
                  <Table.Row>
                    <Table.Cell>Total CU</Table.Cell>
                    <Table.Cell>{formatValue(dc.totalCU)} /hour</Table.Cell>
                  </Table.Row>
                </Table.Body>
              </Table>

              <Divider />

              {costTables.map(ct => {
                let costTotal = 0;

                return (
                  <div key={ct}>
                    <Header as="h5">
                      {ct} &nbsp;
                      <AddCost
                        selectedCost={ct}
                        selectedWorkload={selectedWorkload}
                      />
                    </Header>
                    {costs && costs[ct] && costs[ct].length > 0 ? (
                      <>
                        <Table>
                          <Table.Header>
                            <Table.Row>
                              <Table.HeaderCell
                                style={{ ...nrTableHeaderCell, width: '200px' }}
                              >
                                Name
                              </Table.HeaderCell>
                              <Table.HeaderCell style={nrTableHeaderCell}>
                                Description
                              </Table.HeaderCell>
                              <Table.HeaderCell
                                style={nrTableHeaderCell}
                                textAlign="right"
                              >
                                Units
                              </Table.HeaderCell>
                              <Table.HeaderCell
                                textAlign="right"
                                style={{ ...nrTableHeaderCell, width: '125px' }}
                              >
                                Unit Rate
                              </Table.HeaderCell>
                              <Table.HeaderCell
                                textAlign="right"
                                style={{ ...nrTableHeaderCell, width: '125px' }}
                              >
                                PA Cost
                              </Table.HeaderCell>
                              <Table.HeaderCell
                                textAlign="right"
                                style={{ ...nrTableHeaderCell, width: '100px' }}
                              >
                                Recurring (M)
                              </Table.HeaderCell>
                              <Table.HeaderCell
                                textAlign="right"
                                style={{ ...nrTableHeaderCell, width: '50px' }}
                              />
                            </Table.Row>
                          </Table.Header>

                          <Table.Body>
                            {(costs[ct] || []).map((cost, i) => {
                              costTotal += cost.rate * cost.units;

                              return (
                                <Table.Row key={i}>
                                  <Table.Cell>{cost.title}</Table.Cell>
                                  <Table.Cell>{cost.description}</Table.Cell>
                                  <Table.Cell textAlign="right">
                                    {cost.units}
                                  </Table.Cell>
                                  <Table.Cell textAlign="right">
                                    ${(parseFloat(cost.rate) || 0).toFixed(2)}
                                  </Table.Cell>
                                  <Table.Cell textAlign="right">
                                    ${(cost.rate * cost.units).toFixed(2)}
                                  </Table.Cell>
                                  <Table.Cell textAlign="right">
                                    {cost.recurringMonths}
                                  </Table.Cell>
                                  <Table.Cell textAlign="right">
                                    <Icon
                                      name={deleting ? 'spinner' : 'minus'}
                                      size="small"
                                      color="red"
                                      circular
                                      inverted
                                      loading={deleting}
                                      style={{
                                        cursor: 'pointer',
                                        paddingBottom: '11px'
                                      }}
                                      onClick={() =>
                                        this.deleteCost(
                                          getWorkloadDocs,
                                          guid,
                                          doc,
                                          ct,
                                          i
                                        )
                                      }
                                    />
                                  </Table.Cell>
                                </Table.Row>
                              );
                            })}
                          </Table.Body>
                        </Table>
                        <span style={{ float: 'right' }}>
                          Total: ${costTotal.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <div>
                        No costs assigned.
                        <br />
                        <br />
                      </div>
                    )}
                    <br />
                  </div>
                );
              })}
              <Divider />

              <Header as="h5" style={{ textAlign: 'right' }}>
                Total: ${(costTotal.value || 0).toFixed(2)}
              </Header>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
