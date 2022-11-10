import React, { useContext } from 'react';
import {
  Toast,
  Button,
  Dropdown,
  DropdownItem,
  navigation,
  AccountStorageQuery,
  AccountStorageMutation,
  Spinner
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
    email,
    obfuscate,
    sortBy
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

  const filteredAccountCollection = accountCollection
    .filter(a =>
      a.document.name.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) => {
      const sb = sortBy || 'Most recent';
      const aDoc = a?.history?.[0]?.document;
      const aDocPrior = a?.history?.[1]?.document;
      const bDoc = b?.history?.[0]?.document;
      const bDocPrior = b?.history?.[1]?.document;

      if (sb === 'Cost') {
        const valueA =
          (aDoc?.cost?.known || aDocPrior?.cost?.known || 0) +
          (aDoc?.cost?.estimated || aDocPrior?.cost?.estimated || 0);
        const valueB =
          (bDoc?.cost?.known || bDocPrior?.cost?.known || 0) +
          (bDoc?.cost?.estimated || bDocPrior?.cost?.estimated || 0);

        return valueB - valueA;
      } else if (sb === 'Most recent') {
        const valueA = aDoc?.completedAt || aDocPrior?.completedAt || 0;
        const valueB = bDoc?.completedAt || bDocPrior?.completedAt || 0;

        return valueB - valueA;
      } else if (sb === 'Name') {
        return (a?.document?.name || '').localeCompare(b?.document?.name || '');
      }

      return -1;
    });

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
    const timeRange = lastHistory?.document?.timeRange;

    const startedAtText = lastHistory
      ? new Date(startedAt).toLocaleString()
      : undefined;

    let timeText = '';
    if (!timeRange && lastHistory?.document?.startedAt) {
      const start = new Date(lastHistory?.document?.startedAt);
      const end = new Date(lastHistory?.document?.startedAt - 86400000 * 7);
      timeText = `${end.toLocaleDateString()} - ${start.toLocaleDateString()}`;
    } else if (timeRange?.duration && lastHistory?.document?.startedAt) {
      const start = new Date(lastHistory?.document?.startedAt);
      const end = new Date(
        lastHistory?.document?.startedAt - timeRange.duration
      );
      timeText = `${end.toLocaleDateString()} - ${start.toLocaleDateString()}`;
    } else if (timeRange?.begin_time && timeRange?.end_time) {
      const end = new Date(timeRange.begin_time);
      const start = new Date(timeRange.end_time);
      timeText = `${end.toLocaleDateString()} - ${start.toLocaleDateString()}`;
    }

    const failed =
      startedAt &&
      currentTime - startedAt > 900000 &&
      !lastHistory?.document?.completedAt; // 15m

    const loadingState = dataContext[`loading-${collection.id}`];

    const isRunning =
      loadingState === true ||
      (lastHistory?.document?.status === 'pending' && !failed);

    const hasResults = (history || []).length > 0;

    const failureMessage = failed
      ? 'FAILED'
      : lastHistory?.document?.status || '-';

    const cost = lastHistory?.document?.cost || {};
    const knownAndEstimated = (
      (cost?.known || 0) + (cost?.estimated || 0)
    ).toFixed(2);

    const costStr = lastHistory?.document?.cost
      ? `$${numberWithCommas(knownAndEstimated)}`
      : '-';

    return (
      <React.Fragment key={id}>
        <div
          style={{
            paddingLeft: '15px',
            paddingRight: '15px',
            paddingBottom: '15px',
            display: 'inline-block',
            opacity: isRunning ? '50%' : undefined
          }}
        >
          <div
            style={{
              width: '350px',
              backgroundColor: '#FFFFFF',
              borderTop: '5px solid #252627',
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
                {isRunning && <Spinner />}
                <Dropdown
                  title=""
                  iconType={Dropdown.ICON_TYPE.INTERFACE__OPERATIONS__MORE}
                >
                  <DropdownItem
                    onClick={() => {
                      const nerdlet = {
                        id: 'optimization-configuration-nerdlet',
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
                    Edit recommendations config
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
                <div
                  style={{
                    float: 'left',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  Latest cost
                </div>
                <div
                  style={{
                    float: 'right',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {costStr}
                </div>
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
                  Latest run
                </div>
                <div style={{ float: 'right', fontWeight: 'bold' }}>
                  {startedAtText}
                </div>
              </div>

              <>
                <div
                  style={{
                    paddingTop: '10px',
                    paddingBottom: '30px',
                    borderBottom: '1px solid #e3e3e3'
                  }}
                >
                  <div style={{ float: 'left', fontWeight: 'bold' }}>
                    Period
                  </div>
                  <div style={{ float: 'right', fontWeight: 'bold' }}>
                    {timeText}
                  </div>
                </div>
              </>

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
                      updateDataState({
                        [`loading-${collection.id}`]: true
                      });
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
                      updateDataState({
                        [`loading-${collection.id}`]: true
                      });
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
                        timeRange: dataContext.timeRange,
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
