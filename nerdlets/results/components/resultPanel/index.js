import React, { useContext } from 'react';
import {
  SectionMessage,
  Card,
  CardHeader,
  CardBody,
  Link,
  StackItem
} from 'nr1';
import DataContext from '../../context/data';
import WorkloadView from '../workloadView';
import CostSummary from './costSummary';

// eslint-disable-next-line no-unused-vars
export default function ResultsPanel(props) {
  const dataContext = useContext(DataContext);
  const { workloadData, costSummary } = dataContext;

  return (
    <>
      <StackItem grow style={{ width: '99%', paddingTop: '5px' }}>
        <h4 style={{ paddingBottom: '5px' }}>Total Cost Summary</h4>
        <CostSummary cost={costSummary} tileType="OUTLINE" />
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
                  <CardHeader style={{ fontSize: '16px', fontWeight: 'bold' }}>
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
                          <div style={{ paddingLeft: '5px' }}>
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
  );
}
