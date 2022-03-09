import React, { useState, useContext } from 'react';
import {
  nerdlet,
  TextField,
  Table,
  TableRow,
  TableRowCell,
  TableHeader,
  TableHeaderCell,
  navigation,
  AccountStorageMutation,
  Spinner
} from 'nr1';
import DataContext from '../../context/data';

// eslint-disable-next-line no-unused-vars
export default function CollectionList(props) {
  const dataContext = useContext(DataContext);
  const {
    fetchWorkloadCollections,
    selectedAccount,
    accountCollection,
    updateDataState
  } = dataContext;

  // const [name, setName] = useState("");
  const [searchText, setSearch] = useState('');
  const [column, setColumn] = useState(0);
  const [sortingType, setSortingType] = useState(
    TableHeaderCell.SORTING_TYPE.NONE
  );

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

  const onClickTableHeaderCell = (nextColumn, { nextSortingType }) => {
    if (nextColumn === column) {
      setSortingType(nextSortingType);
    } else {
      setSortingType(nextSortingType);
      setColumn(nextColumn);
    }
  };

  const filteredAccountCollection = accountCollection.filter(a =>
    a.document.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const actions = hasResults => {
    const allActions = [
      {
        label: 'Run',
        onClick: async (evt, { item, index }) => {
          // await runJob(item.id);
          // getJobs();
        }
      },
      {
        label: 'Run with time range',
        onClick: async (evt, { item, index }) => {
          // await runJob(item.id);
          // getJobs();
        }
      },
      {
        label: 'Edit',
        onClick: (evt, { item }) => {
          updateDataState({
            editCollectionOpen: true,
            editCollectionId: item.id
          });
        }
      }
    ];

    if (hasResults)
      allActions.push({
        label: 'Results',
        onClick: (evt, { item }) => {
          const nerdlet = {
            id: 'results-nerdlet',
            urlState: {
              wlCollectionId: item.id,
              ...item.document,
              account: selectedAccount
            }
          };

          navigation.openStackedNerdlet(nerdlet);
        }
      });

    allActions.push({
      label: 'Delete',
      type: TableRow.ACTION_TYPE.DESTRUCTIVE,
      onClick: (evt, { item }) => {
        deleteWorkloadCollection(item.id);
      }
    });

    return allActions;
  };

  return (
    <>
      <TextField
        type={TextField.TYPE.SEARCH}
        placeholder="Search..."
        style={{ width: '100%', paddingBottom: '5px' }}
        onChange={e => setSearch(e.target.value)}
      />

      <Table ariaLabel="" items={filteredAccountCollection} multivalue>
        <TableHeader>
          <TableHeaderCell
            value={({ item }) => item.document.name}
            width="40%"
            sortable
            sortingType={
              column === 0 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(0, data)}
          >
            Name
          </TableHeaderCell>

          <TableHeaderCell
            value={({ item }) => item.document.workloads.length}
            width="10%"
            sortable
            sortingType={
              column === 1 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(1, data)}
          >
            Workloads
          </TableHeaderCell>

          <TableHeaderCell
            width="25%"
            value={({ item }) => item.document.lastEditedBy}
            sortable
            sortingType={
              column === 2 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(2, data)}
          >
            Created By
          </TableHeaderCell>

          <TableHeaderCell
            width="15%"
            value={({ item }) => item?.history?.[0]?.document?.startedAt}
            sortable
            sortingType={
              column === 3 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(3, data)}
          >
            Last Optimized At
          </TableHeaderCell>
        </TableHeader>

        {({ item }) => {
          const { id, document, history } = item;

          const isRunning = false;

          const startedAt = history?.[0]
            ? new Date(history?.[0]?.document?.startedAt).toLocaleString()
            : undefined;

          const hasResults = (history || []).length > 0;

          return (
            <TableRow actions={actions(hasResults)}>
              <TableRowCell additionalValue={id}>{document.name}</TableRowCell>

              <TableRowCell>{document.workloads.length}</TableRowCell>

              <TableRowCell
                additionalValue={`Last edit by: ${document.lastEditedBy}`}
              >
                {document.createdBy}
              </TableRowCell>

              <TableRowCell>{startedAt}</TableRowCell>

              {isRunning ? (
                <TableRowCell style={{ textAlign: 'right' }}>
                  <Spinner inline type={Spinner.TYPE.DOT} />
                </TableRowCell>
              ) : (
                <TableRowCell
                  style={{ textAlign: 'right' }}
                  additionalValue="additionalFailValue"
                >
                  lastResultText
                </TableRowCell>
              )}
            </TableRow>
          );
        }}
      </Table>
    </>
  );
}
