import React, { useContext } from 'react';
import { HeadingText, SectionMessage } from 'nr1';
import DataContext from '../../context/data';
import WorkloadView from '../workloadView';

// eslint-disable-next-line no-unused-vars
export default function ResultsPanel(props) {
  const dataContext = useContext(DataContext);
  const { workloadData } = dataContext;

  return (
    <>
      {Object.keys(workloadData).map(wl => {
        const { name, results } = workloadData[wl];

        // console.log(workloadData[wl]);

        return (
          <React.Fragment key={wl}>
            <HeadingText
              type={HeadingText.TYPE.HEADING_2}
              style={{ marginBottom: '10px' }}
            >
              {name}
            </HeadingText>

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
                <WorkloadView workload={workloadData[wl]} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
