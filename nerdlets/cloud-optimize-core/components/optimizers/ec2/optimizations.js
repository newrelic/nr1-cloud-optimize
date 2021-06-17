import React from 'react';
import { Ec2Consumer } from './context';
import { Segment, Dimmer, Loader } from 'semantic-ui-react';
import { tagFilterEntities } from '../../../../shared/lib/utils';
import Cards from './cards';
import _ from 'lodash';
import RulesConfiguration from './rules';
import { calculateMetricTotals } from './utils';
import InstanceSummary from './summary';
import { AccountPicker } from 'nr1';

export default class Ec2Optimizations extends React.PureComponent {
  render() {
    const {
      sortBy,
      groupBy,
      orderBy,
      selectedTags,
      height,
      setAccount
    } = this.props;

    return (
      <Ec2Consumer>
        {({ processedData, fetchingData, rules, accountId }) => {
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
          if (fetchingData) {
            return (
              <Segment
                style={{
                  minHeight: height - 36,
                  padding: '0px',
                  backgroundColor: '#f7f7f8',
                  border: '0px'
                }}
              >
                <Dimmer active={fetchingData}>
                  <Loader style={{ top: '150px' }} size="big">
                    Fetching Data
                  </Loader>
                </Dimmer>
              </Segment>
            );
          }

          // group entities
          const menuGrouped = _.groupBy(
            processedData,
            e => e[`tag.${groupBy.value}`]
          );

          // group
          let menuGroupEntities = Object.keys(menuGrouped).map(k => {
            const filteredEntities = tagFilterEntities(
              menuGrouped[k] || [],
              selectedTags
            );

            return {
              entities: filteredEntities,
              metricTotals: calculateMetricTotals(filteredEntities),
              name: k
            };
          });

          // sort
          if (sortBy) {
            const order =
              orderBy.value === 'desc' ? ['desc', 'asc'] : ['asc', 'desc'];
            menuGroupEntities = _.orderBy(
              menuGroupEntities,
              d => d.metricTotals[sortBy.value],
              order
            );
          }

          console.log(menuGroupEntities);

          return (
            <>
              {rules && Object.keys(rules).length > 0 ? (
                <>
                  <InstanceSummary groups={menuGroupEntities} />
                  <br />
                  <RulesConfiguration />
                  <Cards groups={menuGroupEntities} accountId={accountId} />
                </>
              ) : (
                ''
              )}
            </>
          );
        }}
      </Ec2Consumer>
    );
  }
}
