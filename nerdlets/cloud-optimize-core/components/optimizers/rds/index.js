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
          orderBy,
          sortBy,
          selectedTags,
          timeRange,
          timepickerEnabled
        }) => {
          return (
            <RdsProvider
              storeState={storeState}
              timeRange={timeRange}
              timepickerEnabled={timepickerEnabled}
            >
              <RdsOptimizations
                height={height}
                groupBy={groupBy}
                sortBy={sortBy}
                orderBy={orderBy}
                selectedTags={selectedTags}
              />
            </RdsProvider>
          );
        }}
      </DataConsumer>
    );
  }
}
