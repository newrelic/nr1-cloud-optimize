import React, { useContext } from 'react';
import {
  BlockText,
  Layout,
  LayoutItem,
  Stack,
  StackItem,
  HeadingText,
  Card,
  CardBody,
  Button,
  navigation,
  Icon,
  UserStorageMutation
} from 'nr1';
import DataContext from '../context/data';
import Loader from '../../shared/components/loader';
import CollectionList from './collectionList';
import QuickStart from './quickStart';
import Messages from './messages';

// eslint-disable-next-line no-unused-vars
export default function Optimizer(props) {
  const dataContext = useContext(DataContext);
  const {
    accountSelectError,
    fetchingAccountCollection,
    accountCollection,
    selectedAccount,
    updateDataState,
    userConfig
  } = dataContext;

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
                              lastNerdlet: 'optimizer-beta'
                            }
                          }).then(() => {
                            navigation.replaceNerdlet({ id: 'optimizer-beta' });
                          });
                        }}
                        iconType={
                          Icon.TYPE.INTERFACE__ARROW__ARROW_RIGHT__V_ALTERNATE
                        }
                      >
                        Switch to beta
                      </Button>
                    </HeadingText>
                    <BlockText
                      type={BlockText.TYPE.PARAGRAPH}
                      style={{ float: 'left', paddingTop: '10px' }}
                    >
                      <Button
                        sizeType={Button.SIZE_TYPE.SMALL}
                        onClick={() =>
                          updateDataState({ createCollectionOpen: true })
                        }
                        iconType={
                          Button.ICON_TYPE.DOCUMENTS__DOCUMENTS__NOTES__A_ADD
                        }
                      >
                        Create Collection
                      </Button>
                    </BlockText>

                    <BlockText
                      type={BlockText.TYPE.PARAGRAPH}
                      style={{ float: 'right' }}
                    >
                      <Button
                        type={Button.TYPE.PRIMARY}
                        sizeType={Button.SIZE_TYPE.SMALL}
                        iconType={Button.ICON_TYPE.INTERFACE__SIGN__EXCLAMATION}
                        onClick={() =>
                          window.open(
                            'https://github.com/newrelic/nr1-cloud-optimize/issues/new?assignees=&labels=bug%2C+needs-triage&template=bug_report.md&title=',
                            '_blank'
                          )
                        }
                      >
                        New Issue
                      </Button>
                      &nbsp;
                      <Button
                        type={Button.TYPE.PRIMARY}
                        sizeType={Button.SIZE_TYPE.SMALL}
                        iconType={
                          Button.ICON_TYPE
                            .PROFILES__EVENTS__FAVORITE__WEIGHT_BOLD
                        }
                        onClick={() =>
                          window.open(
                            'https://github.com/newrelic/nr1-cloud-optimize/issues/new?assignees=&labels=enhancement%2C+needs-triage&template=enhancement.md&title=',
                            '_blank'
                          )
                        }
                      >
                        Feature Request
                      </Button>
                    </BlockText>
                  </CardBody>
                </Card>
              )}

              <Messages />
              <QuickStart />

              {accountCollection && accountCollection.length > 0 && (
                <Card>
                  <CardBody>
                    <CollectionList />
                  </CardBody>
                </Card>
              )}
            </StackItem>
          </Stack>
        </LayoutItem>
      </Layout>
    </div>
  );
}
