import React from 'react';
import { PlatformStateContext, NerdletStateContext } from 'nr1';
import K8sContainerOptimize from './optimize';

export default class K8sContainerOptimizeRoot extends React.Component {
  render() {
    return (
      <PlatformStateContext.Consumer>
        {platformState => (
          <NerdletStateContext.Consumer>
            {nerdletState => {
              return (
                <K8sContainerOptimize {...nerdletState} {...platformState} />
              );
            }}
          </NerdletStateContext.Consumer>
        )}
      </PlatformStateContext.Consumer>
    );
  }
}
