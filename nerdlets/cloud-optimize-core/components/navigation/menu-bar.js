/* eslint 
no-console: 0
*/
import React from 'react';
import Select from 'react-select';
import { DataConsumer } from '../../context/data';
import CostPeriod from './cost-period';
import FilterBar from './filter-bar';
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
          orderBy,
          fetchingEntities,
          postProcessing,
          updateDataState,
          selectedPage
        }) => {
          const isLoading = fetchingEntities || postProcessing;

          let sortByOptions = [];

          if (selectedPage === 'instance-optimizer') {
            sortByOptions = [
              { value: 'currentSpend', label: 'Current Spend' },
              { value: 'cloudSpend', label: 'Cloud Spend' },
              { value: 'spotSpend', label: 'Spot Spend' },
              { value: 'nonSpotSpend', label: 'Non Spot Spend' },
              { value: 'datacenterSpend', label: 'Datacenter Spend' },
              { value: 'potentialSavings', label: 'Potential Savings' },
              {
                value: 'potentialSavingsWithSpot',
                label: 'Potential Savings w/Spot'
              }
            ];
          }

          return (
            <div>
              <div className="utility-bar">
                <div
                  className="react-select-input-group"
                  style={{ width: '200px' }}
                >
                  <label>Group By</label>
                  <Select
                    isDisabled={isLoading || selectedPage === 'home'}
                    options={groupByOptions}
                    onChange={g =>
                      updateDataState({ groupBy: g, selectedGroup: null })
                    }
                    value={groupBy}
                    classNamePrefix="react-select"
                  />
                </div>
                <div
                  className="react-select-input-group"
                  style={{ width: '200px' }}
                >
                  <label>Sort By</label>
                  <Select
                    options={sortByOptions}
                    isDisabled={isLoading || selectedPage === 'home'}
                    onChange={s => updateDataState({ sortBy: s })}
                    value={sortBy}
                    classNamePrefix="react-select"
                  />
                </div>

                <div
                  className="react-select-input-group"
                  style={{ width: '150px' }}
                >
                  <label>Order</label>
                  <Select
                    options={[
                      { value: 'desc', label: 'Descending' },
                      { value: 'asc', label: 'Ascending' }
                    ]}
                    isDisabled={isLoading || selectedPage === 'home'}
                    onChange={s => updateDataState({ orderBy: s })}
                    value={orderBy}
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
                <CostPeriod />

                {/*  <RefreshSelector /> */}
              </div>
              <FilterBar />
            </div>
          );
        }}
      </DataConsumer>
    );
  }
}
