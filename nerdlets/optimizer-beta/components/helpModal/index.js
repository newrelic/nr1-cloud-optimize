import React, { useContext } from 'react';
import { Modal } from 'nr1';
import DataContext from '../../context/data';
import Help from './help';

// eslint-disable-next-line no-unused-vars
export default function HelpModal() {
  const dataContext = useContext(DataContext);
  const { helpModalOpen, updateDataState } = dataContext;

  return (
    <Modal
      hidden={!helpModalOpen}
      onClose={() => updateDataState({ helpModalOpen: false })}
    >
      <Help />
    </Modal>
  );
}
