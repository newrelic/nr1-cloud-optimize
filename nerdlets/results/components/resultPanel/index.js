import React, { useContext } from 'react';
import { SectionMessage, Card, CardHeader, CardBody, Link } from 'nr1';
import DataContext from '../../context/data';
import WorkloadView from '../workloadView';
import CostSummary from './costSummary';

// eslint-disable-next-line no-unused-vars
export default function ResultsPanel(props) {
  const dataContext = useContext(DataContext);
  const { workloadData, costSummary } = dataContext;

  return (
    <>
      <CostSummary cost={costSummary} tileType="OUTLINE" />

      <hr style={{ borderTop: '2px solid #bbb', marginTop: '10px' }} />

      {Object.keys(workloadData)
        .sort()
        .map(wl => {
          const { name, results } = workloadData[wl];
          const wlCost = costSummary?.workloads?.[wl];

          return (
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
                    <div style={{ paddingLeft: '10px' }}>
                      <CostSummary cost={wlCost} />
                      <WorkloadView workload={workloadData[wl]} />
                    </div>
                  )}
                </CardBody>
              </Card>
              {/* <HeadingText
              type={HeadingText.TYPE.HEADING_2}
              style={{ marginBottom: '10px' }}
            >
              {name}
            </HeadingText> */}
            </React.Fragment>
          );
        })}
    </>
  );
}
