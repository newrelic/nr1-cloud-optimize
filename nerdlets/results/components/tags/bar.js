import React, { useContext } from 'react';
import DataContext from '../../context/data';
import { Button, Tooltip } from 'nr1';

// eslint-disable-next-line no-unused-vars
export default function TagBar(props) {
  const dataContext = useContext(DataContext);
  const { updateDataState, selectedTags, recalculate } = dataContext;

  const tagKeys = Object.keys(selectedTags);
  const tagCount = tagKeys.map(key => Object.keys(selectedTags[key])).flat()
    .length;

  const updateTags = async (t, key) => {
    delete selectedTags[t][key];

    if (Object.keys(selectedTags[t]).length === 0) {
      delete selectedTags[t];
    }

    await updateDataState({ selectedTags });
    recalculate();
  };

  return (
    <>
      <div>
        <Tooltip text="Click to filter tags">
          <Button
            style={{ marginRight: '10px' }}
            sizeType={Button.SIZE_TYPE.SMALL}
            type={Button.TYPE.PRIMARY}
            iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__TAG}
            onClick={() => updateDataState({ tagModalOpen: true })}
          >
            Filter Tags {tagCount > 0 && `(${tagCount} selected)`}
          </Button>
        </Tooltip>
        {tagCount > 0 && (
          <Button
            onClick={() => updateDataState({ selectedTags: {} })}
            type={Button.TYPE.OUTLINE}
            sizeType={Button.SIZE_TYPE.SMALL}
          >
            Clear All
          </Button>
        )}
        <br />
      </div>
      <div
        style={{
          marginTop: '10px',
          display: 'inline-block'
        }}
      >
        {tagKeys.map(tag => {
          const tagValues = Object.keys(selectedTags[tag]);

          return tagValues.map(v => {
            return (
              <div
                key={`${tag}.${v}`}
                style={{ paddingBottom: '15px', display: 'inline-block' }}
              >
                <span
                  style={{
                    padding: tagKeys.length > 0 ? '4px' : '0px',
                    fontSize: '12px',
                    marginTop: '10px',
                    marginBottom: '20px',
                    marginRight: '10px',
                    backgroundColor: '#D0F0FF',
                    cursor: 'pointer',
                    borderRadius: '3px'
                  }}
                  onClick={() => updateTags(tag, v)}
                >
                  {tag}:{v}&nbsp;&nbsp;
                  <span style={{ color: '#0079BF' }}>X</span>&nbsp;
                </span>
              </div>
            );
          });
        })}
      </div>
    </>
  );
}
