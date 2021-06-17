import React from 'react';
import { DataConsumer } from '../../../context/data';
import { Ec2Provider } from './context';
import Ec2Optimizations from './optimizations';
import { AccountPicker } from 'nr1';

export default class Ec2Optimizer extends React.PureComponent {
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
          cloudRegions
        }) => {
          return (
            <>
              {accountId && (
                <AccountPicker
                  value={accountId}
                  onChange={(e, accountId) => this.setState({ accountId })}
                />
              )}
              <Ec2Provider
                cloudRegions={cloudRegions}
                accountId={accountId}
                storeState={storeState}
                timeRange={timeRange}
                timepickerEnabled={timepickerEnabled}
              >
                <Ec2Optimizations
                  height={height}
                  groupBy={groupBy}
                  sortBy={sortBy}
                  orderBy={orderBy}
                  selectedTags={selectedTags}
                  setAccount={accountId => this.setState({ accountId })}
                />
              </Ec2Provider>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
