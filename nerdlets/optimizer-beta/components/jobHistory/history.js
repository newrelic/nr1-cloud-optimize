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
    updateDataState,
    jobHistoryFilter,
    jobHistoryFilterName,
    selectedHistory = {},
    selectedJobs = []
  } = dataContext;
  // const [writingDocument, setWriteState] = useState(false);
  const [searchText, setSearch] = useState('');
  const [column, setColumn] = useState(0);
  const [sortingType, setSortingType] = useState(
    TableHeaderCell.SORTING_TYPE.NONE
  );

  const filteredJobs = (jobStatus || [])
    .filter(j =>
      jobHistoryFilter ? jobHistoryFilter === j.wlCollectionId : true
    )
    .filter(
      j =>
        (j?.wlCollectionName || '')
          .toLowerCase()
          .includes(searchText.toLowerCase()) ||
        j.id.includes(searchText.toLowerCase())
    );

  const currentTime = new Date().getTime();

  const onClickTableHeaderCell = (nextColumn, { nextSortingType }) => {
    if (nextColumn === column) {
      setSortingType(nextSortingType);
    } else {
      setSortingType(nextSortingType);
      setColumn(nextColumn);
    }
  };

  return (
    <div>
      <HeadingText
        type={HeadingText.TYPE.HEADING_3}
        style={{ fontSize: '18px' }}
      >
        Optimizer History {jobHistoryFilter ? `- ${jobHistoryFilterName}` : ''}
      </HeadingText>
      <BlockText type={BlockText.TYPE.PARAGRAPH}>
        View and manage your optimization history
      </BlockText>
      <TextField
        style={{ width: '100%', paddingBottom: '15px', paddingTop: '5px' }}
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
          selected={({ item }) => selectedHistory?.[item.id] === true}
          onSelect={(evt, { item }) => {
            selectedHistory[item.id] = evt.target.checked;
            if (selectedHistory[item.id] === false)
              delete selectedHistory[item.id];
            updateDataState({ selectedHistory });
            const sJobs = filteredJobs.filter(job =>
              Object.keys(selectedHistory).find(key => key === job.id)
            );
            updateDataState({ selectedJobs: sJobs });
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
      {(selectedJobs || []).length}/{filteredJobs.length} selected
      <br /> <br />
      <Button
        enabled={selectedJobs.length > 0}
        style={{ float: 'left' }}
        loading={deletingJobDocuments}
        disabled={selectedJobs.length === 0}
        onClick={async () => {
          await deleteMultiJobHistory(selectedJobs);
          updateDataState({ selectedHistory: {}, selectedJobs: [] });
        }}
      >
        Delete selected
      </Button>
      &nbsp;
      <Button
        style={{ float: 'right' }}
        onClick={() =>
          updateDataState({
            jobHistoryOpen: false,
            jobHistoryFilter: null,
            jobHistoryFilterName: null,
            selectedHistory: {},
            selectedJobs: []
          })
        }
      >
        Close
      </Button>
    </div>
  );
}
