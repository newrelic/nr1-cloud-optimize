import React from 'react';
import { Statistic, Card } from 'semantic-ui-react';
import {
  calculateGroupedMetrics,
  adjustCost,
  formatValue
} from '../../../../shared/lib/utils';
import { entityMetricModel, DataConsumer } from '../../../context/data';

export default class InstanceSummary extends React.PureComponent {
  render() {
    const { groups } = this.props;

    const entityMetricTotals = JSON.parse(JSON.stringify(entityMetricModel));

    groups.forEach(g => {
      calculateGroupedMetrics(
        g.entityData || g.entities,
        entityMetricTotals,
        'instances'
      );
    });

    const c = entityMetricTotals.instances;

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
                        ${cost(c.optimizedSpend, 2)}
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
