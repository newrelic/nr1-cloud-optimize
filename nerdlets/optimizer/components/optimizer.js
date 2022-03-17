import React, { useContext } from 'react';
import {
  Icon,
  Popover,
  PopoverTrigger,
  PopoverBody,
  BlockText,
  Layout,
  LayoutItem,
  Stack,
  StackItem,
  HeadingText,
  Card,
  CardBody
} from 'nr1';
import DataContext from '../context/data';
import Loader from '../../shared/components/loader';
import CollectionList from './collectionList';
import QuickStart from './quickStart';

// eslint-disable-next-line no-unused-vars
export default function Optimizer(props) {
  const dataContext = useContext(DataContext);
  const {
    accountSelectError,
    fetchingAccountCollection,
    accountCollection,
    selectedAccount,
    updateDataState
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

  const createText = (
    <span
      onClick={() => updateDataState({ createCollectionOpen: true })}
      style={{
        cursor: 'pointer',
        color: '#017c86',
        fontWeight: 'bold'
      }}
    >
      create
    </span>
  );

  const subText =
    accountCollection && accountCollection.length > 0 ? (
      <>Select or {createText}</>
    ) : (
      <>To begin {createText}</>
    );

  const { id, name } = selectedAccount;
  const account = name || id;

  return (
    <>
      <Layout fullHeight>
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
                <Card>
                  <CardBody>
                    <HeadingText
                      type={HeadingText.TYPE.HEADING_3}
                      style={{
                        paddingBottom: '0px',
                        marginBottom: '1px',
                        fontSize: '18px'
                      }}
                    >
                      Workload Collections from {account}
                    </HeadingText>
                    <BlockText type={BlockText.TYPE.PARAGRAPH}>
                      {subText} a collection of workload(s) to Optimize{' '}
                      <Popover openOnHover>
                        <PopoverTrigger>
                          <Icon type={Icon.TYPE.INTERFACE__INFO__INFO} />
                        </PopoverTrigger>
                        <PopoverBody>
                          <BlockText>
                            &nbsp;A collection is stored under a account but can
                            contain workloads from other accounts&nbsp;
                          </BlockText>
                        </PopoverBody>
                      </Popover>
                    </BlockText>
                  </CardBody>
                </Card>
              )}

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
    </>
  );
}
