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
          selectedTags,
          updateDataState
        }) => {
          const isLoading = fetchingEntities || postProcessing;

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
                disabled={isLoading}
                fluid
                multiple
                search
                selection
                value={selectedTags}
                onChange={(e, d) => updateDataState({ selectedTags: d.value })}
                options={tags}
              />
            </div>
          );
        }}
      </DataConsumer>
    );
  }
}
