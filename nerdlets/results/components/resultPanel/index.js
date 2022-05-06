import React, { useContext, useState } from 'react';
import {
  SectionMessage,
  Button,
  Card,
  CardHeader,
  CardBody,
  Link,
  StackItem,
  SegmentedControl,
  SegmentedControlItem,
  EmptyState
} from 'nr1';
import DataContext from '../../context/data';
import WorkloadView from '../workloadView';
import CostSummary from './costSummary';
import SuggestionsView from './suggestionsView';

// eslint-disable-next-line no-unused-vars
export default function ResultsPanel(props) {
  const dataContext = useContext(DataContext);
  const { workloadData, costSummary, fetchingWorkloadData } = dataContext;
  const [view, setView] = useState('cost');

  if (fetchingWorkloadData) {
    return (
      <StackItem
        grow
        style={{
          paddingTop: '5px',
          width: '99%',
          backgroundColor: 'white'
        }}
      >
        <EmptyState
          title="Hold tight — we’re fetching your data"
          type={EmptyState.TYPE.LOADING}
        />
      </StackItem>
    );
  }

  const suggestions = Object.keys(workloadData)
    .map(guid => workloadData[guid]?.results || [])
    .flat()
    .filter(e => e.suggestions);

  const exportWorkloadData = async data => {
    const timestamp = new Date().getTime();
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: 'application/json' });
    const href = await URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `cloud-optimize-export-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <StackItem grow style={{ paddingTop: '5px', width: '99%' }}>
        <Card fullWidth>
          <CardBody>
            <div style={{ textAlign: 'center' }}>
              <SegmentedControl
                className="segmentControl"
                onChange={(evt, value) => setView(value)}
              >
                <SegmentedControlItem
                  value="cost"
                  label="Cost Analysis"
                  iconType={
                    SegmentedControlItem.ICON_TYPE.INTERFACE__SIGN__DOLLAR_SIGN
                  }
                />
                <SegmentedControlItem
                  value="suggestions"
                  label={`Suggestions (${suggestions.length})`}
                  disabled={suggestions.length === 0}
                  iconType={
                    SegmentedControlItem.ICON_TYPE.INTERFACE__STATE__CRITICAL
                  }
                />
              </SegmentedControl>
            </div>
          </CardBody>
        </Card>
      </StackItem>
      {view === 'suggestions' && (
        <>
          <SuggestionsView workloadData={workloadData} />
        </>
      )}
      {view === 'cost' && (
        <>
          <StackItem grow style={{ width: '99%', paddingTop: '5px' }}>
            <Card>
              <CardBody>
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ paddingBottom: '10px' }}>Total Cost Summary</h4>
                  <CostSummary cost={costSummary} tileType="OUTLINE" />
                </div>
                <Button
                  iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__DOWNLOAD}
                  type={Button.TYPE.PRIMARY}
                  onClick={() => exportWorkloadData(workloadData)}
                  sizeType={Button.SIZE_TYPE.SMALL}
                >
                  Export JSON Data
                </Button>
              </CardBody>
            </Card>
          </StackItem>

          {Object.keys(workloadData)
            .sort()
            .map(wl => {
              const { name, results } = workloadData[wl];
              const wlCost = costSummary?.workloads?.[wl];

              return (
                <StackItem key={wl} grow style={{ width: '99%' }}>
                  <React.Fragment key={wl}>
                    <Card collapsible>
                      <CardHeader style={{ fontSize: '16px' }}>
                        {name}
                        {' - '}
                        <Link
                          onClick={() =>
                            window.open(
                              ` https://one.newrelic.com/redirect/entity/${wl}`,
                              '_blank'
                            )
                          }
                        >
                          View Workload
                        </Link>
                      </CardHeader>
                      <CardBody>
                        {(results || []).length === 0 ? (
                          <SectionMessage
                            style={{ marginTop: '10px', marginBottom: '10px' }}
                            type={SectionMessage.TYPE.WARNING}
                            title="No compatible entities found"
                            description="Please check if your workload contains entities."
                            actions={[
                              {
                                label: 'View workload',
                                onClick: () =>
                                  window.open(
                                    ` https://one.newrelic.com/redirect/entity/${wl}`,
                                    '_blank'
                                  )
                              }
                            ]}
                          />
                        ) : (
                          <>
                            <StackItem grow style={{ width: '99%' }}>
                              <div
                                style={{
                                  paddingLeft: '5px'
                                }}
                              >
                                <CostSummary cost={wlCost} />
                              </div>
                            </StackItem>
                            <StackItem>
                              <WorkloadView workload={workloadData[wl]} />
                            </StackItem>
                          </>
                        )}
                      </CardBody>
                    </Card>
                  </React.Fragment>
                </StackItem>
              );
            })}
        </>
      )}
    </>
  );
}
