import React from 'react';
import { DataConsumer } from '../../../context/data';
import { RdsProvider } from './context';
import RdsOptimizations from './optimizations';

export default class RdsOptimizer extends React.PureComponent {
  render() {
    const { height } = this.props;

    return (
      <DataConsumer>
        {({
          storeState,
          groupBy,
          selectedTags,
          timeRange,
          timepickerEnabled,
          costPeriod
        }) => {
          return (
            <RdsProvider
              storeState={storeState}
              timeRange={timeRange}
              timepickerEnabled={timepickerEnabled}
            >
              <RdsOptimizations
                costPeriod={costPeriod}
                height={height}
                groupBy={groupBy}
                selectedTags={selectedTags}
              />
            </RdsProvider>
          );
        }}
      </DataConsumer>
    );
  }
}
