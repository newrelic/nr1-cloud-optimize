import React from 'react';
import { DataConsumer } from '../../context/data';
import { Loader, Dimmer, Header } from 'semantic-ui-react';
import Tiles from './tiles';

export default class Home extends React.PureComponent {
  render() {
    return (
      <DataConsumer>
        {({
          fetchingEntities,
          postProcessing,
          rawEntities,
          entityDataProgress
        }) => {
          const isLoading = fetchingEntities || postProcessing;
          return (
            <>
              <Dimmer active={isLoading}>
                <Loader size="large">
                  {fetchingEntities
                    ? `Fetching entities - ${rawEntities.length}`
                    : ''}
                  <br />
                  {`Fetching entity data ${entityDataProgress}%`}
                  <br />
                  {!fetchingEntities && postProcessing
                    ? `Post processing ${rawEntities.length} entities`
                    : ''}
                </Loader>
              </Dimmer>

              {!isLoading && rawEntities.length === 0 ? (
                'No entities found'
              ) : (
                <Header
                  as="h3"
                  content="Optimizers"
                  style={{ paddingTop: 0, marginTop: 0 }}
                />
              )}

              <Tiles />
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
