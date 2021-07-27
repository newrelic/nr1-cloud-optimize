import React from 'react';
import { DataConsumer } from '../../../context/data';
import { WorkloadsProvider } from './context';
import WorkloadsOptimizations from './optimizations';
import SubMenu from './subMenu';

export default class WorkloadsOptimizer extends React.PureComponent {
  constructor() {
    super(...arguments);
    this.state = { accountId: null };
  }

  render() {
    const { height } = this.props;
    const { accountId } = this.state;

    return (
      <DataConsumer>
        {({
          storeState,
          groupBy,
          orderBy,
          sortBy,
          selectedTags,
          timeRange,
          timepickerEnabled,
          cloudRegions,
          costPeriod
        }) => {
          return (
            <>
              <WorkloadsProvider
                cloudRegions={cloudRegions}
                accountId={accountId}
                storeState={storeState}
                timeRange={timeRange}
                timepickerEnabled={timepickerEnabled}
              >
                <SubMenu
                  accountId={accountId}
                  setAccount={accountId => this.setState({ accountId })}
                />
                <WorkloadsOptimizations
                  height={height}
                  groupBy={groupBy}
                  sortBy={sortBy}
                  orderBy={orderBy}
                  selectedTags={selectedTags}
                  setAccount={accountId => this.setState({ accountId })}
                  costPeriod={costPeriod}
                  timeRange={timepickerEnabled ? timeRange : null}
                />
              </WorkloadsProvider>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
