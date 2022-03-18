import React, { useContext } from 'react';
import { NerdletStateContext } from 'nr1';
import { DataProvider } from './context/data';
import Results from './components/results';
import TagModal from './components/tags/modal';

function ResultsRoot() {
  const nerdletContext = useContext(NerdletStateContext);

  return (
    <div>
      <DataProvider {...nerdletContext}>
        <TagModal />
        <Results />
      </DataProvider>
    </div>
  );
}

export default ResultsRoot;
