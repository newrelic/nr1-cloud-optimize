import React, { useContext } from 'react';
import { Modal } from 'nr1';
import DataContext from '../../context/data';
import History from './history';

// eslint-disable-next-line no-unused-vars
export default function JobHistoryModal(props) {
  const dataContext = useContext(DataContext);
  const { jobHistoryOpen, updateDataState } = dataContext;

  return (
    <Modal
      hidden={!jobHistoryOpen}
      onClose={() =>
        updateDataState({
          jobHistoryOpen: false,
          jobHistoryFilter: null,
          jobHistoryFilterName: null
        })
      }
    >
      <History />
    </Modal>
  );
}
