import React, { useContext } from 'react';
import {
  Icon,
  Popover,
  PopoverTrigger,
  PopoverBody,
  BlockText,
  Layout,
  LayoutItem,
  Stack,
  StackItem,
  HeadingText,
  Card,
  CardBody,
  Select,
  SelectItem
} from 'nr1';
import DataContext from '../../context/data';
import Loader from '../../../shared/components/loader';
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
