import React, { useContext } from 'react';
import {
  Icon,
  Popover,
  PopoverTrigger,
  PopoverBody,
  BlockText,
  Button,
  Form,
  Layout,
  LayoutItem,
  Stack,
  StackItem,
  HeadingText,
  Card,
  CardBody,
  Select,
  SelectItem
} from 'nr1';
import DataContext from '../context/data';
import Loader from '../../shared/components/loader';
import ResultsPanel from './resultPanel';

// eslint-disable-next-line no-unused-vars
export default function Results(props) {
  const dataContext = useContext(DataContext);
  const {
    name,
    selectedResult,
    fetchingJobStatus,
    jobStatus,
    deleteJob,
    account,
    updateDataState,
    workloads,
    deletingJobDocuments
  } = dataContext;

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

  return (
    <>
      <div>
        <Card>
          <CardBody>
            <HeadingText
              type={HeadingText.TYPE.HEADING_3}
              style={{ paddingBottom: '0px', marginBottom: '1px' }}
            >
              {name} results for {workloads.length} workloads from {accountName}
            </HeadingText>
            <BlockText type={BlockText.TYPE.PARAGRAPH}>
              Optimization results history&nbsp;
              <Popover openOnHover>
                <PopoverTrigger>
                  <Icon type={Icon.TYPE.INTERFACE__INFO__INFO} />
                </PopoverTrigger>
                <PopoverBody>
                  <BlockText>
                    &nbsp;A collection is stored under a account but can contain
                    workloads from other accounts&nbsp;
                  </BlockText>
                </PopoverBody>
              </Popover>
            </BlockText>
          </CardBody>
          <CardBody>
            <div>
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
              &nbsp;
              {jobStatus.length > 0 && (
                <Button
                  loading={deletingJobDocuments}
                  style={{ marginTop: '23px' }}
                  sizeType={Button.SIZE_TYPE.SMALL}
                  type={Button.TYPE.DESTRUCTIVE}
                  iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__TRASH}
                  onClick={() => deleteJob(selectedResult)}
                />
              )}
            </div>
          </CardBody>
        </Card>
      </div>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        <Card>
          <CardBody>
            <ResultsPanel />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
