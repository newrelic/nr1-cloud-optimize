import React, { useContext } from 'react';
import { Steps, StepsItem, Button, HeadingText } from 'nr1';
import DataContext from '../../context/data';
import runOption from '../../images/runOption.png';
import histOption from '../../images/histOption.png';

// eslint-disable-next-line no-unused-vars
export default function QuickStart(props) {
  const dataContext = useContext(DataContext);
  const { updateDataState } = dataContext;

  return (
    <div
      style={{
        overflowX: 'hidden',
        overflowY: 'hidden',
        marginTop: '20px'
      }}
    >
      <HeadingText style={{ fontSize: '18px', paddingBottom: '10px' }}>
        Quick Start Guide
      </HeadingText>

      <Steps
        defaultValue="create-workload-entities"
        style={{ paddingLeft: '25px' }}
      >
        <StepsItem label="Create a collection" value="create-collection">
          A collection is a group of workloads stored under an account but can
          contain workloads from other accounts
          <br />
          <br />
          <Button
            onClick={() => updateDataState({ createCollectionOpen: true })}
            sizeType={Button.SIZE_TYPE.SMALL}
          >
            Create collection
          </Button>
          <br />
          <br />
          1. Name your collection <br />
          2. Select existing workloads <br />
          <br />
          (Optional) Create new workloads and refresh the list to select <br />{' '}
          <br />
          <Button
            onClick={() =>
              window.open(
                'https://one.newrelic.com/workloads?state=7f543f9b-5958-e17a-49ea-9e8337f47eb8',
                '_blank'
              )
            }
            sizeType={Button.SIZE_TYPE.SMALL}
          >
            Create a workload
          </Button>
        </StepsItem>

        <StepsItem
          label="Analyze optimization opportunities"
          value="optimize-collection"
        >
          Large workloads may take time to process.
          <br /> <br />
          <img src={runOption} alt="Run" />
        </StepsItem>
        <StepsItem label="View your optimization results" value="view-history">
          <img src={histOption} alt="History" />
        </StepsItem>
      </Steps>
    </div>
  );
}
