import React from 'react';
import { Statistic, Card } from 'semantic-ui-react';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';
import { DataConsumer } from '../../../context/data';

export default class InstanceSummary extends React.PureComponent {
  render() {
    const { groups } = this.props;

    const metricTotals = {
      currentSpend: 0,
      estimatedNewSpend: 0,
      potentialSavings: 0
    };

    groups.forEach(g => {
      g.entities.forEach(e => {
        metricTotals.currentSpend +=
          parseFloat(e.datastoreSample.currentSpend) || 0;
        metricTotals.potentialSavings += parseFloat(e.potentialSavings) || 0;

        if (!e.isStale) {
          metricTotals.estimatedNewSpend += e.suggestedPrice
            ? parseFloat(e.suggestedPrice)
            : parseFloat(e.datastoreSample.currentSpend) || 0;
        }
      });
    });

    const c = metricTotals;

    return (
      <DataConsumer>
        {({ costPeriod }) => {
          const cost = (s, decimal) =>
            formatValue(adjustCost(costPeriod, s), decimal);

          return (
            <Card color="blue" style={{ width: '100%' }}>
              <Card.Content>
                <Card.Content>
                  <div style={{ textAlign: 'center' }}>
                    <Statistic horizontal>
                      <Statistic.Value>
                        ${cost(c.currentSpend, 2)}
                      </Statistic.Value>
                      <Statistic.Label style={{ paddingRight: '15px' }}>
                        Current Spend
                      </Statistic.Label>
                      <Statistic.Value>
                        ${cost(c.estimatedNewSpend, 2)}
                      </Statistic.Value>
                      <Statistic.Label style={{ paddingRight: '15px' }}>
                        Optimized Spend
                      </Statistic.Label>
                      <Statistic.Value>
                        ${cost(c.potentialSavings, 2)}
                      </Statistic.Value>
                      <Statistic.Label style={{ paddingRight: '15px' }}>
                        Potential Savings
                      </Statistic.Label>
                    </Statistic>
                  </div>
                </Card.Content>
              </Card.Content>
            </Card>
          );
        }}
      </DataConsumer>
    );
  }
}
