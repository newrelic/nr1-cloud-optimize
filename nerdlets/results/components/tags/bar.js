import React, { useContext } from 'react';
import DataContext from '../../context/data';
import { Button, Tooltip } from 'nr1';

// eslint-disable-next-line no-unused-vars
export default function TagBar(props) {
  const dataContext = useContext(DataContext);
  const { updateDataState } = dataContext;

  return (
    <>
      <div style={{ float: 'right', marginTop: '-25px' }}>
        <Tooltip text="Click to filter tags">
          <Button
            style={{ marginRight: '10px' }}
            sizeType={Button.SIZE_TYPE.SMALL}
            type={Button.TYPE.PRIMARY}
            iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__TAG}
            onClick={() => updateDataState({ tagModalOpen: true })}
          >
            Filter Tags
          </Button>
        </Tooltip>
      </div>
    </>
  );
}
