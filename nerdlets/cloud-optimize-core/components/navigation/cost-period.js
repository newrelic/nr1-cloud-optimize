import React from 'react';
import Select from 'react-select';
import { DataConsumer } from '../../context/data';

export default class CostPeriod extends React.PureComponent {
  render() {
    const timeBucketOptions = [
      { key: 1, label: 'HOURLY', value: 'H' },
      { key: 2, label: 'DAILY', value: 'D' },
      { key: 3, label: 'MONTHLY', value: 'M' },
      { key: 4, label: 'YEARLY', value: 'Y' }
      //   { key: 4, label: '2 YEARS', value: 180000 },
      //   { key: 5, label: '3 YEARS', value: 240000 },
      //   { key: 6, label: '4 YEARS', value: 300000 },
      //   { key: 7, label: '5 YEARS', value: 300000 }
    ];

    return (
      <DataConsumer>
        {({
          costPeriod,
          updateDataState,
          fetchingEntities,
          postProcessing,
          selectedPage
        }) => {
          const isLoading = fetchingEntities || postProcessing;

          let display = '';

          if (selectedPage === 'rds-optimizer') display = 'none';

          return (
            <div
              className="react-select-input-group"
              style={{ width: '125px', display }}
            >
              <label>COST PERIOD</label>
              <Select
                isDisabled={
                  isLoading ||
                  selectedPage === 'home' ||
                  selectedPage === 'rds-optimizer'
                }
                options={timeBucketOptions}
                onChange={data => updateDataState({ costPeriod: data })}
                value={costPeriod}
                classNamePrefix="react-select"
              />
            </div>
          );
        }}
      </DataConsumer>
    );
  }
}
