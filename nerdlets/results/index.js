import React, { useContext } from 'react';
import { NerdletStateContext, nerdlet } from 'nr1';
import { DataProvider } from './context/data';
import Results from './components/results';

function ResultsRoot() {
  const nerdletContext = useContext(NerdletStateContext);

  return (
    <div>
      <DataProvider {...nerdletContext}>
        <Results />
      </DataProvider>
    </div>
  );
}

export default ResultsRoot;
