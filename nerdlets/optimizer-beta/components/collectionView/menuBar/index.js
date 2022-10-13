import React, { useContext, useMemo } from 'react';
import {
  BlockText,
  Button,
  SegmentedControl,
  SegmentedControlItem,
  TextField
} from 'nr1';
import DataContext from '../../../context/data';

// eslint-disable-next-line no-unused-vars
export default function CollectionMenuBar(props) {
  const dataContext = useContext(DataContext);
  const { updateDataState } = dataContext;
  const { collectionView, setCollectionView, setSearch } = props;

  return useMemo(() => {
    return (
      <>
        <div style={{ float: 'left' }}>
          <BlockText type={BlockText.TYPE.PARAGRAPH}>
            <Button
              sizeType={Button.SIZE_TYPE.SMALL}
              onClick={() => updateDataState({ createCollectionOpen: true })}
              iconType={Button.ICON_TYPE.DOCUMENTS__DOCUMENTS__NOTES__A_ADD}
            >
              Create Collection
            </Button>
          </BlockText>
        </div>
        <div style={{ float: 'right' }}>
          <SegmentedControl
            onChange={(evt, value) => setCollectionView(value)}
            value={collectionView}
          >
            <SegmentedControlItem
              value="list"
              label="List"
              iconType={
                SegmentedControlItem.ICON_TYPE.DATAVIZ__DATAVIZ__TABLE_CHART
              }
            />
            <SegmentedControlItem
              value="card"
              label="Card"
              iconType={SegmentedControlItem.ICON_TYPE.INTERFACE__SIGN__NUMBER}
            />
          </SegmentedControl>
        </div>

        <br />

        <TextField
          type={TextField.TYPE.SEARCH}
          placeholder="Search..."
          style={{ width: '98.5%', paddingTop: '20px' }}
          onChange={e => setSearch(e.target.value)}
        />
      </>
    );
  }, [collectionView]);
}
