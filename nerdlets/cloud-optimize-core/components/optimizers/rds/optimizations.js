import React from 'react';
import { RdsConsumer } from './context';
import { Segment, Dimmer, Loader } from 'semantic-ui-react';
import { tagFilterEntities } from '../../../../shared/lib/utils';
import Groups from './groups';
import _ from 'lodash';
import RulesConfiguration from './rules';

export default class RdsOptimizations extends React.PureComponent {
  render() {
    const { groupBy, selectedTags, height, costPeriod } = this.props;

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

          const menuGroupEntities = Object.keys(menuGrouped).map(k => ({
            entities: tagFilterEntities(menuGrouped[k] || [], selectedTags),
            name: k
          }));

          return (
            <>
              {rules && Object.keys(rules).length > 0 ? (
                <>
                  <RulesConfiguration />
                  <Groups groups={menuGroupEntities} costPeriod={costPeriod} />
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
