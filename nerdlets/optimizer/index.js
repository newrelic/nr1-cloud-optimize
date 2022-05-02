import React, { useEffect, useContext } from 'react';
import { PlatformStateContext, nerdlet } from 'nr1';
import { DataProvider } from './context/data';
import CollectionCreateModal from './components/collectionCreate';
import Optimizer from './components/optimizer';
import CollectionEditModal from './components/collectionEdit';
import JobHistoryModal from './components/jobHistory';
import SettingsModal from './components/settings/modal';

function OptimizerRoot() {
  useEffect(() => {
    nerdlet.setConfig({
      accountPicker: true,
      accountPickerValues: [...nerdlet.ACCOUNT_PICKER_DEFAULT_VALUES]
    });
  }, []);

  const platformContext = useContext(PlatformStateContext);

  // console.log(window.location.href);

  return (
    <div>
      <DataProvider {...platformContext}>
        <CollectionEditModal />
        <CollectionCreateModal />
        <JobHistoryModal />
        <SettingsModal />
        <Optimizer />
      </DataProvider>
    </div>
  );
}

export default OptimizerRoot;
