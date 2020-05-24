import React from 'react';
import { Table, Card } from 'semantic-ui-react';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';
import { DataConsumer } from '../../../context/data';

export default class ExtendedMetrics extends React.PureComponent {
  render() {
    const { metrics } = this.props;

    return (
      <DataConsumer>
        {({ costPeriod }) => {
          const renderMetric = (title, metric, cost) => (
            <Table.Row>
              <Table.Cell>{title}</Table.Cell>
              <Table.Cell style={{ textAlign: 'right' }}>
                {cost
                  ? `$${formatValue(
                      adjustCost(costPeriod, metrics[metric]),
                      2
                    )}`
                  : formatValue(metrics[metric])}
              </Table.Cell>
            </Table.Row>
          );

          return (
            <>
              <Card color="green" style={{ height: '270px', width: '31%' }}>
                <Card.Content style={{ height: '37px' }}>
                  <span style={{ fontSize: '13px' }}>Spend Breakdown</span>
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
                    <Table.Body style={{ fontSize: '13px' }}>
                      {renderMetric('Amazon Spend', 'amazonSpend', true)}
                      {renderMetric('Azure Spend', 'azureSpend', true)}
                      {renderMetric('Google Spend', 'googleSpend', true)}
                      {renderMetric('Alibaba Spend', 'alibabaSpend', true)}
                      {renderMetric(
                        'Datacenter Spend',
                        'datacenterSpend',
                        true
                      )}
                    </Table.Body>
                  </Table>
                </Card.Content>
                <Card.Content extra />
              </Card>
              <Card color="green" style={{ height: '270px', width: '31%' }}>
                <Card.Content style={{ height: '37px' }}>
                  <span style={{ fontSize: '13px' }}>Instance Breakdown</span>
                </Card.Content>

                <Card.Content style={{ paddingTop: '5px' }}>
                  <Table celled inverted={false} basic="very">
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell />
                        <Table.HeaderCell style={{ textAlign: 'right' }}>
                          Count
                        </Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body style={{ fontSize: '13px' }}>
                      {renderMetric('Amazon', 'amazon')}
                      {renderMetric('Azure', 'azure')}
                      {renderMetric('Google', 'google')}
                      {renderMetric('Alibaba', 'alibaba')}
                      {renderMetric('Other', 'unknown')}
                      {renderMetric('Stale', 'staleInstances')}
                    </Table.Body>
                  </Table>
                </Card.Content>
              </Card>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
