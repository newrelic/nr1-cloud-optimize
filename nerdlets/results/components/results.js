import React, { useContext } from 'react';
import {
  Icon,
  Popover,
  PopoverTrigger,
  PopoverBody,
  BlockText,
  Button,
  HeadingText,
  Tooltip,
  Card,
  CardBody,
  Select,
  SelectItem,
  SectionMessage,
  Stack,
  StackItem
} from 'nr1';
import DataContext from '../context/data';
import Loader from '../../shared/components/loader';
import ResultsPanel from './resultPanel';
import TagBar from './tags/bar';

// eslint-disable-next-line no-unused-vars
export default function Results(props) {
  const dataContext = useContext(DataContext);
  const {
    name,
    selectedResult,
    selectedResultData,
    fetchingJobStatus,
    jobStatus,
    deleteJob,
    account,
    updateDataState,
    workloads,
    deletingJobDocuments
  } = dataContext;
  const document = selectedResultData?.document || {};

  const hoursRan = document?.totalPeriodMs / 3.6e6;

  if (fetchingJobStatus && jobStatus.length === 0) {
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
  } else if (jobStatus.length === 0) {
    return (
      <div>
        <Loader
          loader="lds-ripple"
          message={<span>No history found...</span>}
        />
      </div>
    );
  }

  const accountName = account?.name || account?.id;

  const timeRange = document?.timeRange;
  const timeNrql = document?.timeNrql;

  let timeText = '';
  if (!timeRange) {
    const start = new Date(document.startedAt);
    const end = new Date(document.startedAt - 86400000 * 7);
    timeText = `Data between: ${start.toLocaleString()} to ${end.toLocaleString()} for -${hoursRan} hours`;
  } else if (timeRange.duration) {
    const start = new Date(document.startedAt);
    const end = new Date(document.startedAt - timeRange.duration);
    timeText = `Data between: ${start.toLocaleString()} to ${end.toLocaleString()} for ~${hoursRan} hours`;
  } else if (timeRange.begin_time && timeRange.end_time) {
    const start = new Date(timeRange.begin_time);
    const end = new Date(timeRange.end_time);
    timeText = `Data between: ${start.toLocaleString()} to ${end.toLocaleString()} for ~${hoursRan} hours`;
  }

  return (
    <>
      <Stack directionType={Stack.DIRECTION_TYPE.VERTICAL} fullWidth>
        <StackItem grow style={{ width: '99%' }}>
          <SectionMessage
            title="Please note all information should be considered best effort as it is based on public pricing and available usage data."
            description="The data should be used as general guidance to help you find optimization opportunities"
          />
        </StackItem>
      </Stack>
      <Stack
        fullWidth
        verticalType={Stack.VERTICAL_TYPE.TOP}
        style={{ marginTop: '10px' }}
        gapType={Stack.GAP_TYPE.NONE}
      >
        <StackItem style={{ width: '49.5%' }}>
          <Card style={{ overflow: 'hidden' }}>
            <CardBody>
              <HeadingText
                type={HeadingText.TYPE.HEADING_3}
                style={{
                  paddingBottom: '0px',
                  marginBottom: '1px',
                  fontSize: '18px'
                }}
              >
                {name} results for {workloads.length} workloads from{' '}
                {accountName}
              </HeadingText>
              <BlockText type={BlockText.TYPE.PARAGRAPH}>
                Optimization results history&nbsp;
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
        </StackItem>
        <StackItem style={{ height: '100%', width: '49.5%' }}>
          <Card>
            <CardBody style={{ marginBottom: '0px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ textAlign: 'right', color: '#506060' }}>
                  {timeText}&nbsp;
                  <Popover openOnHover>
                    <PopoverTrigger>
                      <Icon type={Icon.TYPE.INTERFACE__INFO__INFO} />
                    </PopoverTrigger>
                    <PopoverBody>
                      <BlockText>&nbsp;NRQL used: {timeNrql}&nbsp;</BlockText>
                    </PopoverBody>
                  </Popover>
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                {jobStatus.length > 0 && (
                  <Tooltip text="Delete job history">
                    <Button
                      loading={deletingJobDocuments}
                      style={{ marginTop: '23px' }}
                      sizeType={Button.SIZE_TYPE.SMALL}
                      type={Button.TYPE.DESTRUCTIVE}
                      iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__TRASH}
                      onClick={() => deleteJob(selectedResult)}
                    />
                  </Tooltip>
                )}
                &nbsp;
                <Select
                  label="Select time"
                  onChange={(evt, selectedResult) =>
                    updateDataState({ selectedResult })
                  }
                  value={selectedResult}
                >
                  {jobStatus.map(j => {
                    const { id, document } = j;
                    return (
                      <SelectItem key={id} value={id}>
                        {new Date(document?.startedAt).toLocaleString()}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
            </CardBody>
          </Card>
        </StackItem>
      </Stack>
      <Stack
        fullWidth
        verticalType={Stack.VERTICAL_TYPE.TOP}
        directionType={Stack.DIRECTION_TYPE.VERTICAL}
      >
        <StackItem grow style={{ width: '99%' }}>
          <Card>
            <CardBody style={{ marginTop: '0px', marginBottom: '0px' }}>
              <TagBar />
            </CardBody>
          </Card>
        </StackItem>

        <ResultsPanel />
      </Stack>
    </>
  );
}
