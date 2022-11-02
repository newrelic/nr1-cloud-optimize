/* eslint
no-console: 0,
no-async-promise-executor: 0,
no-func-assign: 0,
require-atomic-updates: 0,
no-unused-vars: 0
*/

import React, { Component } from 'react';
import {
  AccountStorageQuery,
  nerdlet,
  Icon,
  NerdGraphQuery,
  NerdGraphMutation,
  EntityStorageQuery,
  EntityStorageMutation,
  AccountStorageMutation,
  UserStorageQuery,
  navigation
} from 'nr1';
import {
  initQuery,
  workloadDiscoveryQuery,
  userApiKeysQuery,
  userApiCreateQuery,
  catalogNerdpacksQuery
} from './queries';
import queue from 'async/queue';

const nr1json = require('../nr1.json');

const QUEUE_LIMIT = 5;
const STATUS_COLLECTION = 'jobStatus';

const DataContext = React.createContext();

export class DataProvider extends Component {
  constructor(props) {
    super(props);

    this.state = {
      apiUrlProd:
        'https://we3ei0yh76.execute-api.us-east-1.amazonaws.com/prod/',
      apiUrlDev: 'https://8qb8qau9g0.execute-api.us-east-1.amazonaws.com/dev',
      initializing: true,
      accountId: null,
      accountSelectError: null,
      selectedAccount: { id: null, name: null },
      accounts: [],
      fetchingAccountCollection: false,
      accountCollection: null,
      createCollectionOpen: false,
      editCollectionOpen: false,
      editCollectionId: null,
      email: null,
      userId: null,
      workloads: [],
      fetchingAccessibleWorkloads: false,
      fetchingUserApiKeys: false,
      userApiKeys: [],
      optimizerKey: null,
      fetchingJobStatus: false,
      timeRange: null,
      messages: [],
      userConfig: null,
      collectionView: 'list',
      fetchingUserConfig: true,
      obfuscate: false
    };
  }

  async componentDidMount() {
    this.getNerdpackUuid();
    const userConfig = await this.getUserConfig();
    if (
      userConfig &&
      userConfig.lastNerdlet &&
      userConfig.lastNerdlet !== nr1json.id
    ) {
      navigation.replaceNerdlet({ id: userConfig.lastNerdlet });
    }
    this.getMessages();
    this.pollJobStatus = setInterval(() => {
      this.fetchJobStatus();
    }, 5000);
  }

  async componentDidUpdate() {
    this.handleUpdate(this.props);
  }

  componentDidCatch(err, errInfo) {
    this.setState({ hasError: true, err, errInfo });
  }

  componentWillUnmount() {
    clearInterval(this.pollJobStatus);
  }

  getMessages() {
    try {
      fetch(
        'https://raw.githubusercontent.com/newrelic/nr1-cloud-optimize/main/messages.json'
      )
        .then(response => response.json())
        .then(messages => this.setState({ messages }));
    } catch (e) {
      console.log('failed to fetch messages', e);
    }
  }

  getUserConfig = () => {
    return new Promise(resolve => {
      UserStorageQuery.query({
        collection: 'USER_CONFIG',
        documentId: 'config'
      }).then(document => {
        this.setState(
          { userConfig: document?.data || {}, fetchingUserConfig: false },
          () => {
            resolve(document?.data);
          }
        );
      });
    });
  };

  handleUpdate = props => {
    if (props.accountId !== this.state.accountId) {
      this.accountChange(props.accountId);
    }
    if (
      props.timeRange &&
      JSON.stringify(props.timeRange) !== JSON.stringify(this.state.timeRange)
    ) {
      this.setState({ timeRange: props.timeRange });
    }
  };

  // Fetch account data with additional information (reportingEventTypes)
  initalizeApp = accountId => {
    const { userApiKeys, optimizerKey } = this.state;
    return new Promise(resolve => {
      // https://developer.newrelic.com/components/nerd-graph-query
      NerdGraphQuery.query({
        query: initQuery
      }).then(nerdGraphData => {
        const result = nerdGraphData?.data;
        const actor = result?.actor || {};
        const accounts = actor?.accounts || [];
        const email = actor?.user?.email || '';
        const userId = actor?.user?.id || '';

        this.fetchUserApiKeys(userId, accountId);
        this.fetchJobStatus(accountId);

        resolve({ accounts, email, userId });
      });
    });
  };

  accountChange = accountId => {
    this.setState({ accountId }, async () => {
      let { accounts, email, userId } = this.state;

      if (accounts.length === 0) {
        const initData = await this.initalizeApp(accountId);
        accounts = initData.accounts;
        email = initData.email;
        userId = initData.userId;
      }

      const foundAccount = accounts.find(a => a.id === accountId);

      this.setState(
        {
          fetchingAccountCollection: true,
          email,
          userId,
          selectedAccount: foundAccount || { id: accountId, name: null },
          fetchingAccessibleWorkloads: false // reset so it can be re-queried
        },
        () => {
          AccountStorageQuery.query({
            accountId,
            collection: 'workloadCollections'
          }).then(({ data }) => {
            this.setState(
              {
                fetchingAccountCollection: false,
                accountCollection: data,
                accountSelectError: foundAccount
                  ? null
                  : 'Please change account or subscribe this application to the relevant accounts'
              },
              () => {
                this.fetchJobStatus();

                nerdlet.setConfig({
                  actionControls: true,
                  actionControlButtons: [
                    {
                      label: 'New Issue',
                      type: 'secondary',
                      iconType: Icon.TYPE.INTERFACE__SIGN__EXCLAMATION,
                      onClick: () =>
                        window.open(
                          'https://github.com/newrelic/nr1-cloud-optimize/issues/new?assignees=&labels=bug%2C+needs-triage&template=bug_report.md&title=',
                          '_blank'
                        )
                    },
                    {
                      label: 'Feature Request',
                      type: 'secondary',
                      iconType:
                        Icon.TYPE.PROFILES__EVENTS__FAVORITE__WEIGHT_BOLD,
                      onClick: () =>
                        window.open(
                          'https://github.com/newrelic/nr1-cloud-optimize/issues/new?assignees=&labels=enhancement%2C+needs-triage&template=enhancement.md&title=',
                          '_blank'
                        )
                    },
                    {
                      label: 'ReadMe',
                      type: 'secondary',
                      iconType: Icon.TYPE.DOCUMENTS__DOCUMENTS__NOTES,
                      onClick: () =>
                        window.open(
                          'https://github.com/newrelic/nr1-cloud-optimize',
                          '_blank'
                        )
                    },
                    {
                      label: 'Settings',
                      type: 'secondary',
                      iconType: Icon.TYPE.INTERFACE__OPERATIONS__CONFIGURE,
                      onClick: () =>
                        this.updateDataState({ settingsModalOpen: true })
                    }
                  ]
                });
              }
            );
          });
        }
      );
    });
  };

  fetchUserApiKeys = (incomingUserId, incomingAccountId) => {
    const { userId, accountId } = this.state;
    const uid = incomingUserId || userId;
    const aid = incomingAccountId || accountId;

    this.setState({ fetchingUserApiKeys: true }, async () => {
      let userApiKeys = [];

      const apiQueue = queue((task, callback) => {
        const { query } = task;

        NerdGraphQuery.query({
          query
        }).then(response => {
          const apiKeyData = response?.data?.actor?.apiAccess?.keySearch || {};
          const userKeys = apiKeyData?.keys || [];
          const cursor = apiKeyData?.nextCursor;

          userApiKeys = [...userApiKeys, ...userKeys];
          if (cursor) {
            apiQueue.push(userApiKeysQuery(uid, aid, cursor));
          }

          callback();
        });
      }, QUEUE_LIMIT);

      apiQueue.push({ query: userApiKeysQuery(uid, aid) });

      await apiQueue.drain();

      const optimizerKey = userApiKeys.find(
        k => k.name === 'NR1-OPTIMIZER-KEY'
      );

      this.setState(
        { userApiKeys, fetchingUserApiKeys: false, optimizerKey },
        () => {
          if (!optimizerKey) {
            this.createOptimizerUserApiKey(uid, aid);
          }
        }
      );
    });
  };

  createOptimizerUserApiKey = (userId, accountId) => {
    NerdGraphMutation.mutate({
      mutation: userApiCreateQuery(userId, accountId)
    }).then(nerdGraphData => {
      const createdKeys =
        nerdGraphData?.data?.apiAccessCreateKeys?.createdKeys || [];

      if (createdKeys.length === 1) {
        this.setState({ optimizerKey: createdKeys[0] });
      } else {
        console.log(
          'unable to automatically create user api key',
          nerdGraphData
        );
      }
    });
  };

  fetchWorkloadCollections = () => {
    const { selectedAccount } = this.state;
    this.setState({ fetchingAccountCollection: true }, () => {
      AccountStorageQuery.query({
        accountId: selectedAccount.id,
        collection: 'workloadCollections'
      }).then(({ data }) => {
        this.setState({
          fetchingAccountCollection: false,
          accountCollection: data
        });
      });
    });
  };

  fetchJobStatus = accountId => {
    const { selectedAccount, accountCollection } = this.state;
    const id = accountId || selectedAccount?.id;
    if (id) {
      this.setState({ fetchingJobStatus: true }, () => {
        AccountStorageQuery.query({
          accountId: id,
          collection: STATUS_COLLECTION
        }).then(({ data }) => {
          // default sort by start time
          const sortedData = data.sort(
            (a, b) => b?.document?.startedAt - a?.document?.startedAt
          );

          // stitch job history to workload collections
          const newAccountCollection = (accountCollection || []).map(a => {
            const history = (sortedData || []).filter(
              d => d?.document?.collectionId === a?.id
            );
            return { ...a, history };
          });

          // stich workload collection info to job history
          const newJobStatus = (sortedData || []).map(d => {
            const wlCollection = (accountCollection || []).find(
              a => a.id === d.document?.collectionId
            );
            return {
              ...d,
              wlCollectionName: wlCollection?.document?.name,
              wlCollectionId: wlCollection?.id
            };
          });

          this.setState({
            fetchingJobStatus: false,
            jobStatus: newJobStatus || [],
            accountCollection: newAccountCollection || []
          });
        });
      });
    }
  };

  // fetch workloads at the provider level
  // this allows us to avoid refreshing if the modal is open and closed multiple times and we can track if a fetch is in progress
  fetchAccessibleWorkloads = () => {
    const { fetchingAccessibleWorkloads, accountId } = this.state;

    if (!fetchingAccessibleWorkloads) {
      this.setState({ fetchingAccessibleWorkloads: true }, async () => {
        let workloads = [];

        const workloadQueue = queue((task, callback) => {
          const { query } = task;

          NerdGraphQuery.query({
            query
          }).then(response => {
            const workloadsData =
              response?.data?.actor?.entitySearch?.results || {};
            const workloadEntities = workloadsData?.entities || [];
            const cursor = workloadsData?.nextCursor;

            workloads = [...workloads, ...workloadEntities];
            if (cursor) {
              workloadQueue.push(workloadDiscoveryQuery(accountId, cursor));
            }

            callback();
          });
        }, QUEUE_LIMIT);

        workloadQueue.push({ query: workloadDiscoveryQuery(accountId) });

        await workloadQueue.drain();

        this.setState({ workloads, fetchingAccessibleWorkloads: false });
      });
    } else {
      console.log('fetching accessible workloads already in progress');
    }
  };

  getNerdpackUuid = async () => {
    // check if manually deployed nerdpack
    let nerdpackUUID = '';
    try {
      nerdpackUUID = window.location.href
        .split('.com/launcher/')[1]
        .split('.')[0];
    } catch (e) {
      // console.log(`nerdpack not manually deployed${e}`);
    }

    // check if nerdpack running locally
    if (nerdpackUUID === '') {
      try {
        const blocks = window.location.href
          .split('https://')[1]
          .split('.')[0]
          .split('-');
        nerdpackUUID = `${blocks[0]}-${blocks[1]}-${blocks[2]}-${blocks[3]}-${blocks[4]}`;
      } catch (e) {
        // console.log(`nerdpack not running locally`);
      }
    }

    // check if nerdpack is running from app catalog
    if (nerdpackUUID === '') {
      await NerdGraphQuery.query({
        query: catalogNerdpacksQuery
      }).then(value => {
        const nerdpacks = (
          value?.data?.actor?.nr1Catalog?.nerdpacks || []
        ).filter(
          n =>
            n.visibility === 'GLOBAL' &&
            n.metadata.repository &&
            n.metadata.repository.includes('nr1-cloud-optimize')
        );

        if (nerdpacks.length > 0) {
          nerdpackUUID = nerdpacks[0].id;
        }
      });
    }

    if (nerdpackUUID) {
      this.setState({ uuid: nerdpackUUID });
    }
  };

  deleteMultiJobHistory = selected => {
    return new Promise(resolve => {
      this.setState({ deletingJobDocuments: true }, async () => {
        const deletePromises = selected.map(data =>
          this.deleteJobHistory(data)
        );
        await Promise.all(deletePromises);
        this.setState({ deletingJobDocuments: false }, () => {
          this.fetchJobStatus();
          resolve();
        });
      });
    });
  };

  deleteJobHistory = data => {
    return new Promise(async resolve => {
      const { accountId, jobStatus } = this.state;
      const { id, document } = data;
      const { workloadGuids } = document;

      const workloadDataPromises = workloadGuids.map(
        w =>
          new Promise(resolve => {
            EntityStorageQuery.query({
              entityGuid: w,
              collection: 'optimizerResults'
            }).then(({ data }) =>
              resolve(
                (data || [])
                  .filter(
                    d => d.id.startsWith(id) || d.id.startsWith('undefined')
                  )
                  .map(d => ({ ...d, guid: w }))
              )
            );
          })
      );

      let workloadData = await Promise.all(workloadDataPromises);
      workloadData = workloadData.flat();

      const docDeletePromises = workloadData.map(w =>
        EntityStorageMutation.mutate({
          entityGuid: w.guid,
          actionType: EntityStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
          collection: 'optimizerResults',
          documentId: w.id
        })
      );

      docDeletePromises.push(
        AccountStorageMutation.mutate({
          accountId,
          actionType: AccountStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
          collection: STATUS_COLLECTION,
          documentId: id
        })
      );

      await Promise.all(docDeletePromises);

      resolve();
    });
  };

  updateDataState = (stateData, actions) =>
    new Promise(resolve => {
      if (
        stateData.createCollectionOpen === true ||
        stateData.editCollectionOpen === true
      ) {
        this.fetchAccessibleWorkloads();
      }

      this.setState(stateData, () => {
        resolve();
      });
    });

  render() {
    const { children } = this.props;

    return (
      <DataContext.Provider
        value={{
          ...this.state,
          updateDataState: this.updateDataState,
          fetchAccessibleWorkloads: this.fetchAccessibleWorkloads,
          fetchWorkloadCollections: this.fetchWorkloadCollections,
          fetchJobStatus: this.fetchJobStatus,
          deleteJobHistory: this.deleteJobHistory,
          deleteMultiJobHistory: this.deleteMultiJobHistory,
          getUserConfig: this.getUserConfig
        }}
      >
        {children}
      </DataContext.Provider>
    );
  }
}

export default DataContext;
export const DataConsumer = DataContext.Consumer;
