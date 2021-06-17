import React from 'react';
import { Card } from 'semantic-ui-react';
import { LineChart } from 'nr1';

export default class ExtendedMetrics extends React.PureComponent {
  render() {
    const { accountId } = this.props;

    return (
      <>
        <Card color="black" style={{ height: '270px', width: '62%' }}>
          <Card.Content>
            <span style={{ fontSize: '13px' }}>Max CPU Percent %</span>
          </Card.Content>
          <div style={{ padding: '10px', height: '100%', width: '100%' }}>
            <LineChart
              accountId={accountId}
              query="FROM ComputeSample SELECT max(provider.cpuUtilization.Maximum) SINCE 1 DAY AGO TIMESERIES AUTO FACET entityName"
              fullWidth
              fullHeight
            />
          </div>
        </Card>
      </>
    );
  }
}
