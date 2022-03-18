import React, { useContext } from 'react';
import DataContext from '../../context/data';
import _ from 'lodash';
import EntityView from '../entityView';
import { checkTags } from '../../context/calculate';

// eslint-disable-next-line no-unused-vars
export default function WorkloadView(props) {
  const dataContext = useContext(DataContext);
  const { selectedTags } = dataContext;
  const { workload } = props;
  const groupedEntities = _.groupBy(workload.results, e => e.entityType);

  return (
    <>
      {Object.keys(groupedEntities).map(g => {
        const filteredEntities = groupedEntities[g].filter(e =>
          checkTags(e, selectedTags)
        );
        return <EntityView key={g} group={g} entities={filteredEntities} />;
      })}
    </>
  );
}
