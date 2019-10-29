import React from 'react';
import { NerdletStateContext, PlatformStateContext, AutoSizer } from 'nr1';
import CloudOptimizeApm from './cloud-optimize-apm'
export default class Root extends React.Component {

    render() {
        return (
            <PlatformStateContext.Consumer>
            {(launcherUrlState) => (
              <NerdletStateContext.Consumer>
                {(nerdletUrlState) => (
                  <AutoSizer>
                    {({width, height}) => (
                      <CloudOptimizeApm
                        launcherUrlState={launcherUrlState}
                        nerdletUrlState={nerdletUrlState}
                        width={width}
                        height={height}
                      />
                    )}
                  </AutoSizer>
                )}
              </NerdletStateContext.Consumer>
            )}
          </PlatformStateContext.Consumer>
        )
    }
}
