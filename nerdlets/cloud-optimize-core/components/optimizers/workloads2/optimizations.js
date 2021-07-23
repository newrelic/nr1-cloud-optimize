import React from 'react';
import { WorkloadsConsumer } from './context';
import { Segment, Dimmer, Loader } from 'semantic-ui-react';
import { AccountPicker } from 'nr1';
import WorkloadTable from './workloadsTable';
import WorkloadAnalysis from './workloadAnalysis';

export default class WorkloadsOptimizations extends React.PureComponent {
  render() {
    const { height, setAccount, costPeriod } = this.props;

    return (
      <WorkloadsConsumer>
        {({ updateDataState, isFetching, selectedWorkload, accountId }) => {
          if (!accountId) {
            return (
              <Segment
                style={{
                  minHeight: height - 36,
                  padding: '0px',
                  backgroundColor: '#f7f7f8',
                  border: '0px'
                }}
              >
                <Dimmer active>
                  <h2 style={{ color: 'white' }}>Select an account to begin</h2>
                  <AccountPicker
                    onChange={(e, accountId) => setAccount(accountId)}
                  />
                </Dimmer>
              </Segment>
            );
          }
          // show loader when fetching
          if (isFetching) {
            return (
              <Segment
                style={{
                  minHeight: height - 36,
                  padding: '0px',
                  backgroundColor: '#f7f7f8',
                  border: '0px'
                }}
              >
                <Dimmer active={isFetching}>
                  <Loader style={{ top: '150px' }} size="big">
                    Fetching Data
                  </Loader>
                </Dimmer>
              </Segment>
            );
          }

          return selectedWorkload ? (
            <WorkloadAnalysis
              selectedWorkload={selectedWorkload}
              costPeriod={costPeriod}
              selectWorkload={() => updateDataState({ selectedWorkload: null })}
            />
          ) : (
            <WorkloadTable
              height={height - 70}
              selectWorkload={e => updateDataState({ selectedWorkload: e })}
            />
          );
        }}
      </WorkloadsConsumer>
    );
  }
}
