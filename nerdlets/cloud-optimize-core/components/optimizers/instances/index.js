import React from 'react';
// import { Form } from 'semantic-ui-react';
import { DataConsumer, categoryTypes } from '../../../context/data';
import { calculateGroupedCosts } from '../../../../shared/lib/utils';
import _ from 'lodash';

export default class InstanceOptimizer extends React.PureComponent {
  checkTag = (tagSelection, group, item, updateDataState) => {
    const newTagSelection = { ...tagSelection };
    newTagSelection[group][item] = !tagSelection[group][item];
    updateDataState({ tagSelection: newTagSelection });
  };

  render() {
    return (
      <DataConsumer>
        {({ groupBy, groupedEntities }) => {
          let entities = [];
          categoryTypes.instance.forEach(type => {
            entities = [...entities, ...(groupedEntities[type] || [])];
          });

          const menuGroupedEntities = _.groupBy(
            entities,
            e => e[`tag.${groupBy.value}`]
          );

          const menuGroupedCosts = {};
          Object.keys(menuGroupedEntities).forEach(k => {
            menuGroupedCosts[k] = calculateGroupedCosts(menuGroupedEntities[k]);
          });

          // console.log(menuGroupedCosts);

          return <></>;
        }}
      </DataConsumer>
    );
  }
}
