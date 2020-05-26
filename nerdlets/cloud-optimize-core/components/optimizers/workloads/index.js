import React from 'react';
import { DataConsumer, categoryTypes } from '../../../context/data';
import { calculateGroupedMetrics } from '../../../../shared/lib/utils';
import Cards from './cards';
import _ from 'lodash';

export default class WorkloadOptimizer extends React.PureComponent {
  render() {
    return (
      <DataConsumer>
        {({ groupBy, sortBy, orderBy, groupedEntities, workloadEntities }) => {
          let entities = [];

          groupedEntities.WORKLOAD = workloadEntities;

          categoryTypes.workloads.forEach(type => {
            entities = [...(groupedEntities[type] || [])];
          });

          const menuGroupedEntities = _.groupBy(
            entities,
            e => e[`tag.${groupBy.value}`]
          );

          let menuGroupedMetrics = [];
          Object.keys(menuGroupedEntities).forEach(k => {
            const group = {
              metrics: calculateGroupedMetrics(
                menuGroupedEntities[k],
                null,
                'workloads'
              ),
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
              d => d.metrics.workloads[sortBy.value],
              order
            );
          }

          const groups = menuGroupedMetrics || [];

          return (
            <>
              <Cards groups={groups} />
              {/* <InstanceSummary groups={groups} />
              <br />  */}
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
