import React, { useContext } from 'react';
import { Card, CardHeader, CardBody, Steps, StepsItem, Button } from 'nr1';
import DataContext from '../../context/data';
import runOption from '../../images/runOption.png';
import histOption from '../../images/histOption.png';

// eslint-disable-next-line no-unused-vars
export default function QuickStart(props) {
  const dataContext = useContext(DataContext);
  const { updateDataState } = dataContext;

  return (
    <>
      <Card collapsible style={{ fontSize: 'unset', overflow: 'hidden' }}>
        <CardHeader title="Quick Start Guide" />
        <CardBody>
          <Steps defaultValue="create-workload-entities">
            <StepsItem
              style={{ fontSize: 'unset' }}
              label="Create a workload of entities to optimize"
              value="add-data"
            >
              <Button
                onClick={() =>
                  window.open(
                    'https://one.newrelic.com/workloads?state=7f543f9b-5958-e17a-49ea-9e8337f47eb8',
                    '_blank'
                  )
                }
              >
                Create a workload
              </Button>
            </StepsItem>
            <StepsItem
              label="Create a collection of workload(s) to target"
              value="create-collection"
            >
              <Button
                onClick={() => updateDataState({ createCollectionOpen: true })}
              >
                Create collection
              </Button>
            </StepsItem>

            <StepsItem
              label="Click the 'Run' action in the table row to optimize your collection"
              value="optimize-collection"
            >
              Large workloads may take time to process.
              <br />
              <img src={runOption} alt="Run" />
            </StepsItem>
            <StepsItem
              label="Click 'Results' to view your optimization history"
              value="view-history"
            >
              <img src={histOption} alt="History" />
            </StepsItem>
            <StepsItem
              label="Improve your stack how you see fit"
              value="finish"
            >
              Rinse and repeat.
            </StepsItem>
          </Steps>
        </CardBody>
      </Card>
    </>
  );
}
