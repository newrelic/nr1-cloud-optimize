import React from 'react';
import _ from 'lodash';
import EntityView from '../entityView';

// eslint-disable-next-line no-unused-vars
export default function WorkloadView(props) {
  const { workload } = props;
  const groupedEntities = _.groupBy(workload.results, e => e.entityType);

  return (
    <>
      {Object.keys(groupedEntities).map(g => {
        return <EntityView key={g} group={g} entities={groupedEntities[g]} />;
      })}
    </>
  );
}
