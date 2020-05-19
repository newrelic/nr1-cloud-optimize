/* eslint 
no-console: 0
*/
import React from 'react';
import Select from 'react-select';
import { DataConsumer } from '../../context/data';
// import CostPeriod from './cost-period';
// import { Popup, Icon } from 'semantic-ui-react';

export default class MenuBar extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <DataConsumer>
        {({
          groupBy,
          groupByOptions,
          sortBy,
          fetchingEntities,
          postProcessing,
          updateDataState
        }) => {
          const isLoading = fetchingEntities || postProcessing;

          return (
            <div>
              <div className="utility-bar">
                <div className="react-select-input-group">
                  <label>Group By</label>
                  <Select
                    isDisabled={isLoading}
                    options={groupByOptions}
                    onChange={g => updateDataState({ groupBy: g })}
                    value={groupBy}
                    classNamePrefix="react-select"
                  />
                </div>
                <div className="react-select-input-group">
                  <label>Sort By</label>
                  <Select
                    isDisabled={isLoading}
                    // options={availableMigrations}
                    // onChange={migration =>
                    //   this.handleMapMenuChange(
                    //     migration,
                    //     updateDataContextState,
                    //     pluckWorkload
                    //   )
                    // }
                    value={sortBy}
                    classNamePrefix="react-select"
                  />
                </div>

                {/* {selectedMigration && migrationId ? (
                  <Popup
                    trigger={
                      <span>
                        <Icon name="tag" color="black" size="large" circular />
                        <b>Migration ID:</b> {migrationId}&nbsp;{' '}
                        <b>Target Cloud:</b> {targetCloud}:&nbsp;{targetRegion}
                      </span>
                    }
                    content="Tag your cloud instances with this MigrationId tag for automatic detection and compliance."
                    position="top center"
                  />
                ) : (
                  ''
                )} */}

                <div className="flex-push" />

                {/* <CostPeriod />

                <RefreshSelector /> */}
              </div>
            </div>
          );
        }}
      </DataConsumer>
    );
  }
}
