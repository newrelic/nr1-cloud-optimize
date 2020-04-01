import React from 'react';
import { NerdletStateContext } from 'nr1';
import CloudOptimizeApm from './cloud-optimize-apm';

export default class Root extends React.Component {
  render() {
    return (
      <NerdletStateContext.Consumer>
        {nerdletUrlState => (
          <CloudOptimizeApm nerdletUrlState={nerdletUrlState} />
        )}
      </NerdletStateContext.Consumer>
    );
  }
}
