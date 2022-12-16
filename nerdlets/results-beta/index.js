import React, { useContext } from 'react';
import { NerdletStateContext } from 'nr1';
import { DataProvider } from './context/data';
import Results from './components/results';
import TagModal from './components/tags/modal';

function ResultsRoot() {
  const nerdletContext = useContext(NerdletStateContext);

  return (
    <div
      style={{
        height: '100%',
        backgroundColor: '#F3F4F4',
        paddingLeft: '15px',
        paddingRight: '15px'
      }}
    >
      <DataProvider {...nerdletContext}>
        <TagModal />
        <Results />
      </DataProvider>
    </div>
  );
}

export default ResultsRoot;
