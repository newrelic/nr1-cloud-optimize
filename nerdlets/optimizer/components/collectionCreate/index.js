import React, { useContext } from 'react';
import { Modal } from 'nr1';
import DataContext from '../../context/data';
import CollectionCreate from './create';

// eslint-disable-next-line no-unused-vars
export default function CollectionCreateModal(props) {
  const dataContext = useContext(DataContext);
  const { createCollectionOpen, updateDataState } = dataContext;

  return (
    <Modal
      hidden={!createCollectionOpen}
      onClose={() => updateDataState({ createCollectionOpen: false })}
    >
      <CollectionCreate />
    </Modal>
  );
}
