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

  const actions = () => {
    return [
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
        onClick: (evt, { item, index }) => {
          updateDataState({
            editCollectionOpen: true,
            editCollectionId: item.id
          });
        }
      },
      {
        label: 'Results',
        onClick: (evt, { item, index }) => {
          // const nerdlet = {
          //   id: "history-nerdlet",
          //   urlState: {
          //     uuid: item.id,
          //     name: item.document.name,
          //     accountId: selectedAccount.id,
          //     accountName: selectedAccount.name,
          //   },
          // };
          // navigation.openStackedNerdlet(nerdlet);
        }
      },
      {
        label: 'Delete',
        type: TableRow.ACTION_TYPE.DESTRUCTIVE,
        onClick: (evt, { item, index }) => {
          deleteWorkloadCollection(item.id);
        }
      }
    ];
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
            width="45%"
            sortable
            sortingType={
              column === 0 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(0, data)}
          >
            Name
          </TableHeaderCell>

          <TableHeaderCell
            width="15%"
            value={({ item }) => item.document.lastEditedBy}
            sortable
            sortingType={
              column === 1 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(1, data)}
          >
            Created By
          </TableHeaderCell>

          <TableHeaderCell
            width="15%"
            value={({ item }) => item.document.status}
            sortable
            sortingType={
              column === 2 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(2, data)}
          >
            Last Optimized At
          </TableHeaderCell>
        </TableHeader>

        {({ item }) => {
          const { document } = item;

          const isRunning = false;

          return (
            <TableRow actions={actions()}>
              <TableRowCell
                additionalValue={`Workloads: ${document.workloads.length}`}
              >
                {document.name}
              </TableRowCell>

              <TableRowCell
                additionalValue={`Last edit by: ${document.lastEditedBy}`}
              >
                {document.createdBy}
              </TableRowCell>

              <TableRowCell>{document.lastOptimizedAt}</TableRowCell>

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
