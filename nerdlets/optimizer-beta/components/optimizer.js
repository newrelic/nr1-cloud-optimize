import React, { useContext, useState } from 'react';
import {
  Layout,
  LayoutItem,
  CollapsibleLayoutItem,
  Stack,
  StackItem,
  HeadingText,
  Card,
  CardBody,
  Button,
  navigation,
  Icon,
  UserStorageMutation,
  AutoSizer
} from 'nr1';
import DataContext from '../context/data';
import Loader from '../../shared/components/loader';
import CollectionList from './collectionView/list';
import QuickStart from './quickStart';
import Messages from './messages';
import CollectionCard from './collectionView/card';
import CollectionMenuBar from './collectionView/menuBar';

// eslint-disable-next-line no-unused-vars
export default function Optimizer(props) {
  const dataContext = useContext(DataContext);
  const {
    accountSelectError,
    fetchingAccountCollection,
    accountCollection,
    selectedAccount,
    userConfig,
    sortBy,
    updateDataState
  } = dataContext;
  const [hideQuickStart, setHideQuickStart] = useState(false);
  // const [collectionView, setCollectionView] = useState('card');
  const [searchText, setSearch] = useState('');

  const setSortBy = value => {
    updateDataState({ sortBy: value });
  };

  if (fetchingAccountCollection) {
    return (
      <div>
        <Loader
          loader="lds-ripple"
          message={
            <span>Fetching workload collections for your accounts...</span>
          }
        />
      </div>
    );
  }

  const { id, name } = selectedAccount;
  const account = name || id;

  const renderQuickStart = () => {
    if (!userConfig || hideQuickStart || userConfig.quickstartDismissed) {
      return;
    }

    return (
      <LayoutItem
        type={CollapsibleLayoutItem.TYPE.SPLIT_RIGHT}
        triggerType={CollapsibleLayoutItem.TRIGGER_TYPE.INBUILT}
        style={{
          overflowY: 'hidden',
          overflowX: 'hidden'
        }}
      >
        <AutoSizer>
          {({ height }) => {
            return (
              <div style={{ marginTop: height / 3 }}>
                <QuickStart setHideQuickStart={setHideQuickStart} />
              </div>
            );
          }}
        </AutoSizer>
      </LayoutItem>
    );
  };

  return (
    <div style={{ height: '100%' }}>
      <Layout fullHeight style={{ overflowY: 'hidden' }}>
        <LayoutItem>
          <Stack directionType={Stack.DIRECTION_TYPE.VERTICAL} fullWidth>
            <StackItem grow style={{ width: '100%' }}>
              {accountSelectError ? (
                <>
                  <Card>
                    <CardBody>
                      <Loader
                        loader="lds-ripple"
                        loaderStyle={{ color: 'red' }}
                        message={
                          <span
                            style={{
                              textAlign: 'center',
                              fontWeight: 'bold'
                            }}
                          >
                            {accountSelectError}
                          </span>
                        }
                      />
                    </CardBody>
                  </Card>
                </>
              ) : (
                <Card style={{ overflowY: 'hidden' }}>
                  <CardBody>
                    <Messages />

                    <HeadingText
                      type={HeadingText.TYPE.HEADING_3}
                      style={{
                        paddingBottom: '0px',
                        marginBottom: '1px',
                        fontSize: '18px'
                      }}
                    >
                      <span style={{ paddingRight: '10px' }}>
                        Workload Collections from {account}
                      </span>

                      <Button
                        style={{ marginTop: '2px' }}
                        sizeType={Button.SIZE_TYPE.SMALL}
                        onClick={() => {
                          UserStorageMutation.mutate({
                            actionType:
                              UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
                            collection: 'USER_CONFIG',
                            documentId: 'config',
                            document: {
                              ...userConfig,
                              lastNerdlet: 'optimizer'
                            }
                          }).then(() => {
                            navigation.replaceNerdlet({ id: 'optimizer' });
                          });
                        }}
                        iconType={
                          Icon.TYPE.INTERFACE__ARROW__ARROW_RIGHT__V_ALTERNATE
                        }
                      >
                        Switch to stable
                      </Button>
                    </HeadingText>
                    <br />

                    <CollectionMenuBar
                      searchText={searchText}
                      setSearch={setSearch}
                      // setCollectionView={setCollectionView}
                      // collectionView={collectionView}
                      setSortBy={setSortBy}
                      sortBy={sortBy}
                    />
                  </CardBody>
                </Card>
              )}

              {accountCollection && accountCollection.length > 0 && (
                <Card>
                  <CardBody>
                    {userConfig?.collectionView === 'card' ? (
                      <CollectionCard searchText={searchText} sortBy={sortBy} />
                    ) : (
                      <CollectionList searchText={searchText} sortBy={sortBy} />
                    )}
                  </CardBody>
                </Card>
              )}
            </StackItem>
          </Stack>
        </LayoutItem>

        {renderQuickStart()}
      </Layout>
    </div>
  );
}
