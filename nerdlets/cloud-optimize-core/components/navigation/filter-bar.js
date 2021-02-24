/* eslint 
no-console: 0
*/
import React from 'react';
import { Dropdown, Icon } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';

export default class FilterBar extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <DataConsumer>
        {({
          fetchingEntities,
          postProcessing,
          tags,
          tagsRds,
          selectedTags,
          selectedPage,
          updateDataState,
          selectedWorkload
        }) => {
          const isLoading = fetchingEntities || postProcessing;

          // set default tags as instance tags
          let tagSet = tags;

          switch (selectedPage) {
            case 'rds-optimizer': {
              tagSet = tagsRds;
            }
          }

          return (
            <div
              className="filters-container"
              style={{ textAlign: 'left', height: '36px' }}
            >
              <Icon
                name="search"
                size="large"
                style={{
                  float: 'left',
                  paddingTop: '5px',
                  marginLeft: '15px'
                }}
              />
              <Dropdown
                style={{
                  borderRadius: 0,
                  width: '95%',
                  border: 0,
                  background: '#F4F5F5',
                  float: 'left',
                  position: 'relative',
                  display: 'inline-block'
                }}
                placeholder="Filter Tags"
                disabled={isLoading || selectedWorkload !== null}
                fluid
                multiple
                search
                selection
                value={selectedTags}
                onChange={(e, d) => updateDataState({ selectedTags: d.value })}
                options={tagSet}
              />
            </div>
          );
        }}
      </DataConsumer>
    );
  }
}
