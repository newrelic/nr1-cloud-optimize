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
          entityDataProgress,
          accountConfigProgress,
          cloudPricingProgress
        }) => {
          const isLoading = fetchingEntities || postProcessing;
          return (
            <>
              <Dimmer active={isLoading}>
                <Loader size="large">
                  Please be patient while we analyze your entities...
                  <br />
                  <br />
                  {fetchingEntities ? (
                    <>
                      Fetching {rawEntities.length} entities
                      <br />
                      <br />
                    </>
                  ) : (
                    ''
                  )}
                  {!fetchingEntities && postProcessing ? (
                    <>
                      Processing {rawEntities.length} entities
                      <br />
                      <br />
                    </>
                  ) : (
                    ''
                  )}
                  {`Fetching entity data ${entityDataProgress.toFixed(2)}%`}
                  <br />
                  <br />
                  {`Fetching cloud pricing ${cloudPricingProgress.toFixed(2)}%`}
                  <br />
                  <br />
                  {`Fetching account configs ${accountConfigProgress.toFixed(
                    2
                  )}%`}
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
