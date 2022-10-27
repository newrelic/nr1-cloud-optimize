import React, { useState, useContext } from 'react';
import {
  Button,
  HeadingText,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  BlockText,
  TextField
  // AccountStorageMutation
} from 'nr1';
import DataContext from '../../context/data';

// eslint-disable-next-line no-unused-vars
export default function History(props) {
  const dataContext = useContext(DataContext);
  const {
    jobStatus,
    deletingJobDocuments,
    deleteMultiJobHistory,
    updateDataState
  } = dataContext;
  // const [writingDocument, setWriteState] = useState(false);
  const [searchText, setSearch] = useState('');
  const [column, setColumn] = useState(0);
  const [selected, setSelected] = useState({});
  const [sortingType, setSortingType] = useState(
    TableHeaderCell.SORTING_TYPE.NONE
  );

  const filteredJobs = (jobStatus || []).filter(
    j =>
      (j?.wlCollectionName || '')
        .toLowerCase()
        .includes(searchText.toLowerCase()) ||
      j.id.includes(searchText.toLowerCase())
  );

  // const writeDocument = () => {
  //   setWriteState(true);

  //   const document = {
  //     name,
  //     createdBy: email,
  //     lastEditedBy: email
  //   };

  //   AccountStorageMutation.mutate({
  //     accountId: selectedAccount.id,
  //     actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
  //     collection: 'workloadCollections',
  //     documentId: uuidv4(),
  //     document
  //   }).then(value => {
  //     // eslint-disable-next-line no-console
  //     console.log('wrote document', value);

  //     setWriteState(false);
  //     updateDataState({ jobHistoryOpen: false });
  //   });
  // };

  const currentTime = new Date().getTime();

  const onClickTableHeaderCell = (nextColumn, { nextSortingType }) => {
    if (nextColumn === column) {
      setSortingType(nextSortingType);
    } else {
      setSortingType(nextSortingType);
      setColumn(nextColumn);
    }
  };

  const selectedJobs = filteredJobs.filter(job =>
    Object.keys(selected).find(key => key === job.id)
  );

  return (
    <div>
      <HeadingText
        type={HeadingText.TYPE.HEADING_3}
        style={{ fontSize: '18px' }}
      >
        Optimizer History
      </HeadingText>
      <BlockText type={BlockText.TYPE.PARAGRAPH}>
        View and manage your optimization history
      </BlockText>
      <TextField
        style={{ width: '100%', paddingBottom: '15px' }}
        type={TextField.TYPE.SEARCH}
        // label="Workload collection name"
        placeholder="eg. my name or job id"
        value={searchText}
        onChange={e => setSearch(e.target.value)}
      />
      {filteredJobs.length > 0 ? (
        <Table
          ariaLabel=""
          items={filteredJobs}
          multivalue
          style={{ padding: '0px', fontSize: '12px', maxHeight: '500px' }}
          selected={({ item }) => selected?.[item.id] === true}
          onSelect={(evt, { item }) => {
            selected[item.id] = evt.target.checked;
            if (selected[item.id] === false) delete selected[item.id];
            setSelected(selected);
          }}
        >
          <TableHeader>
            <TableHeaderCell
              value={({ item }) => item?.wlCollectionName || item?.id || ''}
              sortable
              sortingType={
                column === 0 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
              }
              onClick={(event, data) => onClickTableHeaderCell(0, data)}
              width="33%"
            >
              Name
            </TableHeaderCell>
            <TableHeaderCell
              value={({ item }) => item?.document?.startedAt || ''}
              sortable
              sortingType={
                column === 1 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
              }
              onClick={(event, data) => onClickTableHeaderCell(1, data)}
            >
              Time
            </TableHeaderCell>
          </TableHeader>

          {({ item }) => {
            const { document, wlCollectionName } = item;
            const { startedAt, completedAt, status } = document;
            const startTime = new Date(startedAt).toLocaleString();
            const endTime = new Date(completedAt).toLocaleString();
            const failed = currentTime - startedAt > 900000 && !completedAt; // 15m

            return (
              <TableRow>
                <TableRowCell
                  additionalValue={wlCollectionName ? item.id : undefined}
                >
                  {wlCollectionName || item.id}
                </TableRowCell>
                {failed ? (
                  <TableRowCell style={{ color: 'red', fontWeight: 'bold' }}>
                    FAILED
                  </TableRowCell>
                ) : (
                  <TableRowCell
                    additionalValue={
                      completedAt ? `Start:  ${startTime}` : status
                    }
                  >
                    {completedAt
                      ? `Finish: ${endTime}`
                      : `Start:   ${startTime}`}
                  </TableRowCell>
                )}
              </TableRow>
            );
          }}
        </Table>
      ) : (
        'No job history found'
      )}
      <br />
      <Button
        enabled={selectedJobs.length > 0}
        style={{ float: 'left' }}
        loading={deletingJobDocuments}
        disabled={selectedJobs.length === 0}
        onClick={() => {
          deleteMultiJobHistory(selectedJobs);
        }}
      >
        Delete selected
      </Button>
      &nbsp;
      <Button
        style={{ float: 'right' }}
        onClick={() => updateDataState({ jobHistoryOpen: false })}
      >
        Close
      </Button>
    </div>
  );
}
