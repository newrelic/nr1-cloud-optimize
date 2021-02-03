import React from 'react';
import { RdsConsumer } from './context';
import { Segment, Dimmer, Loader } from 'semantic-ui-react';
import { tagFilterEntities } from '../../../../shared/lib/utils';
import Cards from './cards';
import _ from 'lodash';
import RulesConfiguration from './rules';
import { calculateMetricTotals } from './utils';
import InstanceSummary from './summary';

export default class RdsOptimizations extends React.PureComponent {
  render() {
    const { sortBy, groupBy, orderBy, selectedTags, height } = this.props;

    return (
      <RdsConsumer>
        {({ entities, fetchingEntities, rules }) => {
          // show loader when fetching
          if (fetchingEntities) {
            return (
              <Segment
                style={{
                  minHeight: height - 36,
                  padding: '0px',
                  backgroundColor: '#f7f7f8',
                  border: '0px'
                }}
              >
                <Dimmer active={fetchingEntities}>
                  <Loader style={{ top: '150px' }} size="big">
                    Fetching Entities
                  </Loader>
                </Dimmer>
              </Segment>
            );
          }

          // group entities
          const menuGrouped = _.groupBy(
            entities,
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

          return (
            <>
              {rules && Object.keys(rules).length > 0 ? (
                <>
                  <InstanceSummary groups={menuGroupEntities} />
                  <br />
                  <RulesConfiguration />
                  <Cards groups={menuGroupEntities} />
                </>
              ) : (
                ''
              )}
            </>
          );
        }}
      </RdsConsumer>
    );
  }
}
