import React from 'react';
import { NerdletStateContext } from 'nr1';
import { Grid, Loader, Dimmer, Segment } from 'semantic-ui-react';
import CloudOptimizeApm from './cloud-optimize-apm';
import OptimizationCandidates from './components/optimization-candidates';
import MenuBar from './components/menu-bar';
import { groupInstances } from '../shared/lib/processor';

export default class Root extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      userConfig: null,
      hasCloud: false,
      totals: {
        optimizedCost: 0,
        nonOptimizedCost: 0,
        saving: 0,
        optimizedCount: 0,
        nonOptimizedCount: 0
      },
      grouped: [],
      groupByDefault: 'accountName'
    };

    this.toggleLoading = this.toggleLoading.bind(this);
    this.toggleHasCloud = this.toggleHasCloud.bind(this);
    this.groupInstances = this.groupInstances.bind(this);
    this.onUserConfigChange = this.onUserConfigChange.bind(this);
  }

  // trigger can also be 'recalc'
  onUserConfigChange({ config, trigger = '' }) {
    this.setState({ userConfig: config });
    this.groupInstances({ data: null, type: trigger, val: null });
  }

  toggleLoading({ loading }) {
    this.setState({ loading });
  }

  toggleHasCloud({ hasCloud }) {
    this.setState({ hasCloud });
  }

  groupInstances({ data, type, val }) {
    const { totals, grouped, tempData } = groupInstances(
      data,
      type,
      val,
      this.state,
      true
    );

    this.setState({
      totals,
      data: tempData,
      grouped
    });
  }

  render() {
    const { grouped, hasCloud, loading, totals, userConfig } = this.state;

    const minHeight = window.innerHeight - 75;

    return (
      <div>
        <MenuBar
          fetchCloudPricing={this.fetchCloudPricing}
          totals={totals}
          onUserConfigChange={this.onUserConfigChange}
        />

        <Segment
          style={{
            minHeight: minHeight,
            padding: '0px',
            backgroundColor: '#f7f7f8',
            border: '0px'
          }}
        >
          <Dimmer active={loading}>
            <Loader style={{ top: '150px' }} size="big">
              Loading
            </Loader>
          </Dimmer>

          <Grid
            relaxed
            stretched
            columns="equal"
            style={{ padding: '3px', margin: '0px' }}
          >
            {userConfig && (
              <NerdletStateContext.Consumer>
                {nerdletUrlState => (
                  <CloudOptimizeApm
                    nerdletUrlState={nerdletUrlState}
                    userConfig={userConfig}
                    toggleLoading={this.toggleLoading}
                    toggleHasCloud={this.toggleHasCloud}
                    groupInstances={this.groupInstances}
                  />
                )}
              </NerdletStateContext.Consumer>
            )}

            {userConfig && (
              <OptimizationCandidates
                grouped={grouped}
                userConfig={userConfig}
                hasCloud={hasCloud}
              />
            )}
          </Grid>
        </Segment>
      </div>
    );
  }
}
