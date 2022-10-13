import React, { useContext } from 'react';
import {
  Toast,
  Button,
  Dropdown,
  DropdownItem,
  navigation,
  AccountStorageQuery,
  AccountStorageMutation
} from 'nr1';
import DataContext from '../../../context/data';

// eslint-disable-next-line no-unused-vars
export default function CollectionCard(props) {
  const dataContext = useContext(DataContext);
  const {
    fetchWorkloadCollections,
    selectedAccount,
    accountCollection,
    updateDataState,
    apiUrlDev,
    apiUrlProd,
    optimizerKey,
    uuid,
    timeRange,
    email,
    obfuscate
  } = dataContext;

  const { searchText } = props;
  const isLocal =
    !window.location.href.includes('https://one.newrelic.com') &&
    !window.location.href.includes('https://one.eu.newrelic.com');
  const apiUrl = isLocal ? apiUrlDev : apiUrlProd;

  const deleteWorkloadCollection = documentId => {
    return new Promise(resolve => {
      AccountStorageMutation.mutate({
        accountId: selectedAccount.id,
        actionType: AccountStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
        collection: 'workloadCollections',
        documentId
      }).then(async result => {
        fetchWorkloadCollections();
        resolve(result);
      });
    });
  };

  const filteredAccountCollection = accountCollection.filter(a =>
    a.document.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getLatestConfiguration = documentId => {
    return new Promise(resolve => {
      AccountStorageQuery.query({
        accountId: selectedAccount.id,
        collection: 'workloadCollections',
        documentId
      }).then(value => resolve(value?.data?.config || {}));
    });
  };

  const numberWithCommas = x => {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
  };

  return filteredAccountCollection.map(collection => {
    const { id, document, history } = collection;
    const { createdBy, lastEditedBy } = document;

    const currentTime = new Date().getTime();
    const lastHistory = history?.[0];
    const startedAt = lastHistory?.document?.startedAt;
    const startedAtText = lastHistory
      ? new Date(startedAt).toLocaleString()
      : undefined;

    let startDate = '';
    let startTime = '';

    if (startedAtText) {
      const startSplit = startedAtText.split(',');
      startDate = startSplit[0];
      startTime = startSplit[1];
    }

    const failed =
      startedAt &&
      currentTime - startedAt > 900000 &&
      !lastHistory?.document?.completedAt; // 15m

    const isRunning = lastHistory?.document?.status === 'pending' && !failed;

    const hasResults = (history || []).length > 0;

    const failureMessage = failed
      ? 'FAILED'
      : lastHistory?.document?.status || '-';

    const cost = lastHistory?.document?.cost || {};
    const knownAndEstimated = (cost?.known || 0 + cost?.estimated || 0).toFixed(
      2
    );
    const costStr = lastHistory?.document?.cost
      ? `$${numberWithCommas(knownAndEstimated)}`
      : '-';

    return (
      <React.Fragment key={id}>
        <div
          style={{
            paddingLeft: '15px',
            paddingRight: '15px',
            display: 'inline-block'
          }}
        >
          <div
            style={{
              width: '350px',
              backgroundColor: '#FFFFFF',
              borderTop: '5px solid green',
              borderLeft: '1px solid #e3e3e3',
              borderRight: '1px solid #e3e3e3',
              borderBottom: '1px solid #e3e3e3',
              paddingBottom: '20px',
              boxShadow: '5px 5px 15px 5px #e3e3e3',
              WebkitBoxShadow: '5px 5px 15px 5px #e3e3e3'
            }}
          >
            <div
              style={{
                paddingLeft: '20px',
                paddingRight: '20px',
                paddingTop: '10px',
                paddingBottom: '25px'
              }}
            >
              <div style={{ float: 'left' }}>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {document.name}
                </span>
              </div>
              <div style={{ float: 'right' }}>
                <Dropdown
                  title=""
                  iconType={Dropdown.ICON_TYPE.INTERFACE__OPERATIONS__MORE}
                >
                  <DropdownItem
                    onClick={() => {
                      const nerdlet = {
                        id: 'suggestions-configuration-nerdlet',
                        urlState: {
                          wlCollectionId: collection.id,
                          document: collection.document,
                          account: selectedAccount,
                          email
                        }
                      };

                      navigation.openStackedNerdlet(nerdlet);
                    }}
                  >
                    Edit suggestions config
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => deleteWorkloadCollection(collection.id)}
                  >
                    Delete config
                  </DropdownItem>
                </Dropdown>
              </div>
            </div>
            <div style={{ paddingLeft: '20px', fontWeight: 'bold' }}>
              {document.workloads.length} workloads&nbsp;
              <Button
                style={{ marginTop: '-10px' }}
                type={Button.TYPE.PLAIN}
                iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__EDIT}
                onClick={() => {
                  updateDataState({
                    editCollectionOpen: true,
                    editCollectionId: collection.id
                  });
                }}
              />
            </div>
            <br />
            <div style={{ paddingLeft: '20px', paddingRight: '20px' }}>
              <div
                style={{
                  paddingBottom: '10px',
                  borderBottom: '1px solid #e3e3e3'
                }}
              >
                <div style={{ float: 'left', fontWeight: 'bold' }}>
                  Latest cost
                </div>
                <div style={{ float: 'right' }}>{costStr}</div>
                <br />
              </div>
              <div
                style={{
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #e3e3e3'
                }}
              >
                <div style={{ float: 'left', fontWeight: 'bold' }}>
                  Created by
                </div>
                <div style={{ float: 'right' }}>{createdBy}</div>
                <br />
                <div style={{ float: 'left' }}>Last edited by</div>
                <div style={{ float: 'right' }}>{lastEditedBy}</div>
                <br />
              </div>
              <div
                style={{
                  paddingTop: '10px',
                  paddingBottom: '30px',
                  borderBottom: '1px solid #e3e3e3'
                }}
              >
                <div style={{ float: 'left', fontWeight: 'bold' }}>
                  Latest request
                </div>
                <div style={{ float: 'right', fontWeight: 'bold' }}>
                  {startDate}
                </div>
                <br />
                <div style={{ float: 'left' }} />
                <div style={{ float: 'right' }}>{startTime}</div>
              </div>
              <div
                style={{
                  paddingTop: '5px',
                  paddingBottom: '30px'
                }}
              >
                <div style={{ float: 'left', fontWeight: 'bold' }}>
                  Latest status
                </div>
                <div style={{ float: 'right' }}>
                  {isRunning ? 'Analyzing' : failureMessage}
                </div>
              </div>

              <div style={{ paddingBottom: '20px' }}>
                <div style={{ float: 'left' }}>
                  <Button
                    disabled={isRunning}
                    type={Button.TYPE.SECONDARY}
                    sizeType={Button.SIZE_TYPE.SMALL}
                    onClick={async () => {
                      Toast.showToast({
                        title: 'Requesting job',
                        type: Toast.TYPE.TERTIARY
                      });
                      const config = await getLatestConfiguration(
                        collection.id
                      );

                      postData(`${apiUrl}/optimize`, optimizerKey.key, {
                        workloadGuids: collection.document.workloads.map(
                          w => w.guid
                        ),
                        accountId: selectedAccount.id,
                        nerdpackUUID: uuid,
                        collectionId: collection.id,
                        config
                      }).then(data => {
                        if (data?.success) {
                          Toast.showToast({
                            title: 'Job sent successfully',
                            description: 'Processing... can take up to 15m',
                            type: Toast.TYPE.TERTIARY
                          });
                        } else {
                          Toast.showToast({
                            title: 'Job failed to send',
                            description:
                              data?.message ||
                              'Check... console & network logs for errors',
                            type: Toast.TYPE.CRITICAL
                          });
                        }
                      });
                    }}
                  >
                    Analyze past 7 days
                  </Button>
                </div>
                <div style={{ float: 'right' }}>
                  <Button
                    disabled={isRunning}
                    type={Button.TYPE.TERTIARY}
                    sizeType={Button.SIZE_TYPE.SMALL}
                    onClick={async () => {
                      Toast.showToast({
                        title: 'Requesting job',
                        type: Toast.TYPE.TERTIARY
                      });
                      const config = await getLatestConfiguration(
                        collection.id
                      );
                      postData(`${apiUrl}/optimize`, optimizerKey.key, {
                        workloadGuids: collection.document.workloads.map(
                          w => w.guid
                        ),
                        accountId: selectedAccount.id,
                        nerdpackUUID: uuid,
                        collectionId: collection.id,
                        timeRange,
                        config
                      }).then(data => {
                        if (data?.success) {
                          Toast.showToast({
                            title: 'Job sent successfully',
                            description: 'Processing... can take up to 15m',
                            type: Toast.TYPE.TERTIARY
                          });
                        } else {
                          Toast.showToast({
                            title: 'Job failed to send',
                            description:
                              data?.message ||
                              'Check... console & network logs for errors',
                            type: Toast.TYPE.CRITICAL
                          });
                        }
                      });
                    }}
                  >
                    Analyze with time range
                  </Button>
                </div>
              </div>

              <div style={{ paddingTop: '20px' }}>
                <Button
                  disabled={!hasResults}
                  type={Button.TYPE.PRIMARY}
                  onClick={() => {
                    const nerdlet = {
                      id: 'results-nerdlet',
                      urlState: {
                        wlCollectionId: collection.id,
                        ...collection.document,
                        account: selectedAccount,
                        obfuscate
                      }
                    };

                    navigation.openStackedNerdlet(nerdlet);
                  }}
                >
                  Show optimization results
                </Button>
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  });
}

function postData(url = '', key, data = {}) {
  return new Promise(resolve => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'NR-API-KEY': key,
        'NR-REGION': (window?.location?.host || '').includes('one.eu.')
          ? 'EU'
          : undefined
      },
      body: JSON.stringify(data)
    })
      .then(async response => {
        const responseData = await response.json();
        resolve(responseData);
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        resolve({ success: false, error });
        resolve();
      });
  });
}
