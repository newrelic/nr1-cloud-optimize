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
import WorkloadView from '../workloadView';

// eslint-disable-next-line no-unused-vars
export default function ResultsPanel(props) {
  const dataContext = useContext(DataContext);
  const { workloadData } = dataContext;

  return (
    <>
      {Object.keys(workloadData).map(wl => {
        return <WorkloadView key={wl} workload={workloadData[wl]} />;
      })}
    </>
  );
}
