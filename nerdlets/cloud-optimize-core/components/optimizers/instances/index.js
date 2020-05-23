import React from 'react';
import InstanceCards from './cards';
import { DataConsumer, categoryTypes } from '../../../context/data';
import { calculateGroupedMetrics } from '../../../../shared/lib/utils';
import _ from 'lodash';
import InstanceSummary from './summary';

export default class InstanceOptimizer extends React.PureComponent {
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

          let menuGroupedMetrics = [];
          Object.keys(menuGroupedEntities).forEach(k => {
            const group = {
              metrics: calculateGroupedMetrics(menuGroupedEntities[k]),
              entities: menuGroupedEntities[k] || [],
              name: k
            };
            menuGroupedMetrics.push(group);
          });

          if (sortBy) {
            const order =
              orderBy.value === 'desc' ? ['desc', 'asc'] : ['asc', 'desc'];
            menuGroupedMetrics = _.orderBy(
              menuGroupedMetrics,
              d => d.metrics.instances[sortBy.value],
              order
            );
          }

          const groups = menuGroupedMetrics || [];

          return (
            <>
              <InstanceSummary groups={groups} />
              <br />
              <InstanceCards groups={groups} />
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
