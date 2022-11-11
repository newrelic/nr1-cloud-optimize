import React, { useContext, useMemo } from 'react';
import {
  BlockText,
  Button,
  SegmentedControl,
  SegmentedControlItem,
  TextField,
  Dropdown,
  DropdownItem,
  UserStorageMutation
} from 'nr1';
import DataContext from '../../../context/data';

// eslint-disable-next-line no-unused-vars
export default function CollectionMenuBar(props) {
  const dataContext = useContext(DataContext);
  const { updateDataState, userConfig, sortBy } = dataContext;
  const {
    collectionView,
    // setCollectionView,
    setSearch,
    setSortBy
  } = props;

  return useMemo(() => {
    return (
      <>
        <div style={{ float: 'left' }}>
          <BlockText type={BlockText.TYPE.PARAGRAPH}>
            <Button
              type={Button.TYPE.PRIMARY}
              sizeType={Button.SIZE_TYPE.SMALL}
              onClick={() => updateDataState({ createCollectionOpen: true })}
              iconType={Button.ICON_TYPE.DOCUMENTS__DOCUMENTS__NOTES__A_ADD}
            >
              Create Collection
            </Button>
            &nbsp;&nbsp;
            <Button
              type={Button.TYPE.NORMAL}
              sizeType={Button.SIZE_TYPE.SMALL}
              onClick={() => updateDataState({ jobHistoryOpen: true })}
              iconType={Button.ICON_TYPE.DATE_AND_TIME__DATE_AND_TIME__DATE}
            >
              Manage History
            </Button>
          </BlockText>
        </div>

        <div
          style={{
            float: 'right'
          }}
        >
          <SegmentedControl
            onChange={(evt, value) => {
              const newUserConfig = { ...userConfig, collectionView: value };
              updateDataState({ userConfig: newUserConfig });
              UserStorageMutation.mutate({
                actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
                collection: 'USER_CONFIG',
                documentId: 'config',
                document: newUserConfig
              });
            }}
            value={userConfig?.collectionView}
          >
            <SegmentedControlItem
              value="card"
              label="Card"
              iconType={SegmentedControlItem.ICON_TYPE.INTERFACE__SIGN__NUMBER}
            />
            <SegmentedControlItem
              value="list"
              label="List"
              iconType={
                SegmentedControlItem.ICON_TYPE.DATAVIZ__DATAVIZ__TABLE_CHART
              }
            />
          </SegmentedControl>
        </div>

        <div
          style={{
            float: 'right',
            paddingRight: '15px',
            display: userConfig?.collectionView === 'list' ? 'none' : ''
          }}
        >
          <Dropdown title={sortBy} label="Sort by" labelInline>
            <DropdownItem onClick={() => setSortBy('Most recent')}>
              Most recent
            </DropdownItem>
            <DropdownItem onClick={() => setSortBy('Cost')}>Cost</DropdownItem>
            <DropdownItem onClick={() => setSortBy('Name')}>Name</DropdownItem>
          </Dropdown>
        </div>

        <br />

        <TextField
          type={TextField.TYPE.SEARCH}
          placeholder="Search..."
          style={{ width: '100%', paddingTop: '20px' }}
          onChange={e => setSearch(e.target.value)}
        />
      </>
    );
  }, [userConfig, collectionView, sortBy]);
}
