import React from 'react';
import { Form } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';

export default class Tags extends React.PureComponent {
  checkTag = (tagSelection, group, item, updateDataState) => {
    const newTagSelection = { ...tagSelection };
    newTagSelection[group][item] = !tagSelection[group][item];
    updateDataState({ tagSelection: newTagSelection });
  };

  render() {
    const { height } = this.props;
    const reduceHeight = 230;
    const tagFilterHeight = height - reduceHeight;
    const maxHeight = tagFilterHeight < 0 ? reduceHeight : tagFilterHeight;
    return (
      <DataConsumer>
        {({ tagSelection, updateDataState }) => {
          return (
            <Form
              style={{
                maxHeight: `${maxHeight}px`,
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingLeft: '8px'
              }}
            >
              {Object.keys(tagSelection).map(group => {
                return (
                  <Form.Group grouped key={group}>
                    <span
                      style={{ textTransform: 'uppercase', fontSize: '10px' }}
                    >
                      {group.replace('m.', '')}
                    </span>
                    {Object.keys(tagSelection[group]).map((item, i) => {
                      return (
                        <Form.Checkbox
                          style={{ fontSize: '10px' }}
                          key={i}
                          label={item}
                          value={item}
                          checked={tagSelection[group][item]}
                          onChange={() =>
                            this.checkTag(
                              tagSelection,
                              group,
                              item,
                              updateDataState
                            )
                          }
                        />
                      );
                    })}
                  </Form.Group>
                );
              })}
            </Form>
          );
        }}
      </DataConsumer>
    );
  }
}
