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
  ngql
} from 'nr1';
import {
  initQuery,
  workloadDiscoveryQuery,
  userApiKeysQuery,
  userApiCreateQuery,
  catalogNerdpacksQuery
} from './queries';
import queue from 'async/queue';

const RESULT_UPDATE_INTERVAL = 5000;
const QUEUE_LIMIT = 5;
const STATUS_COLLECTION = 'jobStatus';

const DataContext = React.createContext();

export class DataProvider extends Component {
  constructor(props) {
    super(props);

    this.state = {
      apiUrl: 'https://8qb8qau9g0.execute-api.us-east-1.amazonaws.com/dev',
      fetchingJobStatus: false,
      fetchingWorkloadData: false,
      jobStatus: [],
      selectedResult: null,
      selectedResultData: null,
      optimizerResults: [],
      workloadData: {},
      deletingJobDocuments: false
    };
  }

  componentDidMount() {
    this.getNerdpackUuid();
    this.fetchJobStatus(this.props);

    this.setState({ ...this.props }, () => {
      this.pollJobStatus = setInterval(() => {
        this.fetchJobStatus(this.props);
      }, RESULT_UPDATE_INTERVAL);
    });
  }

  fetchJobStatus = (props, getLast) => {
    const { account } = props;
    const wlCollectionId = props.wlCollectionId || this.state.wlCollectionId;
    const accountId =
      account?.id || this.state.account?.id || this.state.accountId;
    const { selectedResult } = this.state;

    if (accountId) {
      this.setState(
        { fetchingJobStatus: true, accountId, wlCollectionId },
        () => {
          AccountStorageQuery.query({
            accountId,
            collection: STATUS_COLLECTION
          }).then(({ data }) => {
            // default sort by start time
            const sortedData = data.sort(
              (a, b) => b?.document?.startedAt - a?.document?.startedAt
            );

            // stich workload collection info to job history
            const newJobStatus = (sortedData || []).filter(
              d => d.document?.collectionId === wlCollectionId
            );

            const newState = {
              fetchingJobStatus: false,
              jobStatus: newJobStatus || []
            };

            if (!selectedResult || getLast) {
              const lastIndex = getLast ? newJobStatus.length - 1 : null;
              newState.selectedResult = newJobStatus?.[lastIndex || 0]?.id;
              newState.selectedResultData = newJobStatus?.[lastIndex || 0];
            }

            this.updateDataState(newState);
          });
        }
      );
    }
  };

  // query each workload for the history of a particular job
  fetchWorkloads = (guids, jobId) => {
    return new Promise(resolve => {
      this.setState({ fetchingWorkloadData: true }, async () => {
        const buildDocumentName = shardNo => `${jobId}_${shardNo}`;
        const workloadData = {};
        const workloadGuids = guids.map(g => ({ entityGuid: g, shardNo: 1 }));

        const workloadQueue = queue((task, callback) => {
          const { entityGuid, shardNo } = task;
          const documentId = buildDocumentName(shardNo || 1);

          EntityStorageQuery.query({
            entityGuid: entityGuid,
            collection: 'optimizerResults',
            documentId
          }).then(response => {
            const data = response?.data;

            if (!workloadData[entityGuid]) {
              // inject latest workload entity data
              NerdGraphQuery.query({
                query: `{
                actor {
                  entity(guid: "${entityGuid}") {
                    ... on WorkloadEntity {
                      guid
                      name
                      tags {
                        key
                        values
                      }
                      alertSeverity
                    }
                  }
                }
              }
              `
              }).then(ngData => {
                const entityData = ngData?.data?.actor?.entity || {};

                workloadData[entityGuid] = {
                  ...data,
                  ...entityData,
                  documentIds: [documentId]
                };

                const shardTotal = data?.shardTotal;
                for (let z = 2; z < shardTotal + 1; z++) {
                  workloadQueue.push({ entityGuid, shardNo: z });
                }

                callback();
              });
            } else {
              // merge sharded results
              workloadData[entityGuid].results = [
                ...workloadData[entityGuid].results,
                ...(response?.data?.results || [])
              ];

              workloadData[entityGuid].documentIds.push(documentId);

              callback();
            }
          });
        }, QUEUE_LIMIT);

        workloadQueue.push(workloadGuids);

        await workloadQueue.drain();

        // need to add some calculations

        console.log(workloadData);

        this.setState({ workloadData }, () => resolve(workloadData));
      });
    });
  };

  updateDataState = (stateData, actions) =>
    new Promise(resolve => {
      if (stateData.selectedResult) {
        stateData.selectedResultData =
          stateData.selectedResultData ||
          (this.state.jobStatus || []).find(
            j => j?.id === stateData?.selectedResult
          );

        // fetch all workload data
        this.fetchWorkloads(
          stateData?.selectedResultData?.document?.workloadGuids || [],
          stateData.selectedResultData?.id
        );
      }

      this.setState(stateData, () => {
        resolve();
      });
    });

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
        query: ngql`
            ${catalogNerdpacksQuery}
          `
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

  deleteJob = id => {
    this.setState({ deletingJobDocuments: true }, async () => {
      const { workloadData, accountId, wlCollectionId, jobStatus } = this.state;
      const documentsToDelete = [];

      Object.keys(workloadData).forEach(key => {
        const jobId = workloadData[key]?.jobId;
        const entityGuid = workloadData[key]?.guid;

        // remove all job result shards from each workload
        if (jobId === id) {
          (workloadData[key]?.documentIds || []).forEach(documentId => {
            documentsToDelete.push(
              EntityStorageMutation.mutate({
                entityGuid,
                actionType: EntityStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
                collection: 'optimizerResults',
                documentId
              })
            );
          });
        }
      });

      documentsToDelete.push(
        AccountStorageMutation.mutate({
          accountId,
          actionType: AccountStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
          collection: STATUS_COLLECTION,
          documentId: id
        })
      );

      await Promise.all(documentsToDelete);

      this.fetchJobStatus(wlCollectionId, true);

      this.setState({ deletingJobDocuments: false });
    });
  };

  render() {
    const { children } = this.props;

    return (
      <DataContext.Provider
        value={{
          ...this.state,
          updateDataState: this.updateDataState,
          fetchJobStatus: this.fetchJobStatus,
          deleteJob: this.deleteJob
        }}
      >
        {children}
      </DataContext.Provider>
    );
  }
}

export default DataContext;
export const DataConsumer = DataContext.Consumer;
