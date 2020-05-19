import React from 'react';
import { DataConsumer } from '../../context/data';
import { Loader, Dimmer } from 'semantic-ui-react';
import Tiles from './tiles';

export default class Home extends React.PureComponent {
  render() {
    return (
      <DataConsumer>
        {({ fetchingEntities, postProcessing, rawEntities }) => {
          const isLoading = fetchingEntities || postProcessing;
          return (
            <>
              <Dimmer active={isLoading}>
                <Loader>
                  {fetchingEntities
                    ? `Fetching entities -  ${rawEntities.length}`
                    : ''}
                  {!fetchingEntities && postProcessing
                    ? `Post processing ${rawEntities.length} entities`
                    : ''}
                </Loader>
              </Dimmer>

              {!isLoading && rawEntities.length === 0
                ? 'No entities found'
                : ''}

              <Tiles />
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
