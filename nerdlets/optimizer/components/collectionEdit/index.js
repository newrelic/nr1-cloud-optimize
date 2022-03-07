import React, { useContext } from 'react';
import { Modal } from 'nr1';
import DataContext from '../../context/data';
import CollectionEdit from './edit';

// eslint-disable-next-line no-unused-vars
export default function CollectionEditModal(props) {
  const dataContext = useContext(DataContext);
  const { editCollectionOpen, updateDataState } = dataContext;

  return (
    <Modal
      hidden={!editCollectionOpen}
      onClose={() => updateDataState({ editCollectionOpen: false })}
    >
      <CollectionEdit />
    </Modal>
  );
}
