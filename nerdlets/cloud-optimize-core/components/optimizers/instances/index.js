import React from 'react';
import InstanceCards from './cards';
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
        {({ groupBy, sortBy, orderBy, groupedEntities }) => {
          let entities = [];
          categoryTypes.instances.forEach(type => {
            entities = [...entities, ...(groupedEntities[type] || [])];
          });

          const menuGroupedEntities = _.groupBy(
            entities,
            e => e[`tag.${groupBy.value}`]
          );

          let menuGroupedCosts = [];
          Object.keys(menuGroupedEntities).forEach(k => {
            const group = {
              costs: calculateGroupedCosts(menuGroupedEntities[k]),
              entities: menuGroupedEntities[k],
              name: k
            };
            menuGroupedCosts.push(group);
          });

          if (sortBy) {
            const order =
              orderBy.value === 'desc' ? ['desc', 'asc'] : ['asc', 'desc'];
            menuGroupedCosts = _.orderBy(
              menuGroupedCosts,
              d => d.costs.instances[sortBy.value],
              order
            );
          }

          return (
            <>
              <InstanceCards groups={menuGroupedCosts} />
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
