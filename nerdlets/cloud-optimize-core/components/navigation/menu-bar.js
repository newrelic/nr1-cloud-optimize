/* eslint 
no-console: 0
*/
import React from 'react';
import Select from 'react-select';
import { DataConsumer } from '../../context/data';
import CostPeriod from './cost-period';
import FilterBar from './filter-bar';
import { Radio, Popup } from 'semantic-ui-react';
import { toast } from 'react-toastify';

toast.configure();

export default class MenuBar extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <DataConsumer>
        {({
          selectedPage,
          groupBy,
          groupByOptions,
          groupByOptionsRds,
          sortBy,
          orderBy,
          fetchingEntities,
          postProcessing,
          updateDataState,
          timepickerEnabled,
          postProcessEntities
        }) => {
          const isLoading = fetchingEntities || postProcessing;

          let groupByOptionsSet = groupByOptions;

          switch (selectedPage) {
            case 'rds-optimizer': {
              groupByOptionsSet = groupByOptionsRds;
            }
          }

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
                    options={groupByOptionsSet}
                    onChange={g =>
                      updateDataState({
                        groupBy: g,
                        selectedGroup: null,
                        selectedWorkload: null
                      })
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
                    isDisabled={
                      isLoading ||
                      selectedPage === 'home' ||
                      selectedPage === 'workload-optimizer' ||
                      selectedPage === 'rds-optimizer'
                    }
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
                    isDisabled={
                      isLoading ||
                      selectedPage === 'home' ||
                      selectedPage === 'workload-optimizer'
                    }
                    onChange={s => updateDataState({ orderBy: s })}
                    value={orderBy}
                    classNamePrefix="react-select"
                  />
                </div>

                <CostPeriod />

                <div className="flex-push" />
                <Popup
                  basic
                  content="After the Time Picker is enabled select a time range above to evalute your optimization results. Disabling resets to 7 days."
                  trigger={
                    <Radio
                      toggle
                      label="Time Picker"
                      checked={timepickerEnabled}
                      onChange={() => {
                        updateDataState({
                          timepickerEnabled: !timepickerEnabled
                        });
                        if (!timepickerEnabled === false) {
                          postProcessEntities();
                          toast.info('Resetting to 7 day window.', {
                            containerId: 'C'
                          });
                        } else {
                          toast.info(
                            'Time Picker enabled, please select a time range to update.',
                            {
                              containerId: 'C'
                            }
                          );
                        }
                      }}
                      style={{ paddingRight: '10px' }}
                    />
                  }
                />

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
