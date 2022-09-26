import React, { useContext, useState } from 'react';
import {
  Steps,
  StepsItem,
  Button,
  HeadingText,
  UserStorageMutation,
  Checkbox
} from 'nr1';
import DataContext from '../../context/data';
import runOption from '../../images/runOption.png';
import histOption from '../../images/histOption.png';

// eslint-disable-next-line no-unused-vars
export default function QuickStart(props) {
  const dataContext = useContext(DataContext);
  const { updateDataState, getUserConfig, userConfig } = dataContext;
  const { setHideQuickStart } = props;
  const [dismissing, setDismissing] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const dismissQuickStart = async () => {
    if (dontShowAgain) {
      setDismissing(true);
      await UserStorageMutation.mutate({
        actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
        collection: 'USER_CONFIG',
        documentId: 'config',
        document: { ...userConfig, quickstartDismissed: true }
      });
      await getUserConfig();
      setDismissing(false);
    } else {
      setHideQuickStart(true);
    }
  };

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
        style={{ paddingLeft: '25px', paddingBottom: '25px' }}
      >
        <StepsItem label="Create a workload (optional)" value="create-workload">
          Cloud Optimize uses Workloads to analyze specific sets of entities.
          Workloads allow you to group related entities, using logical
          categories such as cloud region, business capability, or business
          owner. If the grouping of entities that you need does not yet exist,
          go ahead click "Create a workload" now. If the the Workloads you need
          have already been created, move on to the next step.
          <br />
          <br />
          <Button
            onClick={() =>
              // with open stacked nerdlet after creation it replaces the bottom nerdlet to workloads
              // navigation.openStackedNerdlet({
              //   id: 'workloads.create'
              // })
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

        <StepsItem label="Create a collection" value="create-collection">
          While Workloads are used to efficiently target logically related
          groups of entities, a Cloud Optimize collection allows you to assemble
          one or more Workloads together for analysis. Click on "Create
          collection" to select the Workloads you need to include. If the
          Workload you need isn't listed, return to the previous step to create
          it.
          <br />
          <br />
          <Button
            onClick={() => updateDataState({ createCollectionOpen: true })}
            sizeType={Button.SIZE_TYPE.SMALL}
          >
            Create collection
          </Button>
          <br />
        </StepsItem>

        <StepsItem label="Analyze the collection" value="optimize-collection">
          Your collection should now show up in the collections table. At the
          end of the row for your collection, click on the '...' to see the set
          of available actions. Run an analysis by selecting either the "Run
          (analyze past 7 days)" or "Run with time range" options. If your
          collection contains a large workload, the analysis may take some time
          to process.
          <br /> <br />
          <img src={runOption} alt="Run" />
        </StepsItem>
        <StepsItem label="View the Results" value="view-results">
          Once the analysis is complete, a "Results" option will now be
          available as an action for your collection (click on '...' in the
          table row). Select "Results" to see the optimization and cost analysis
          generated for your collection! If you would like to change the
          settings used in the analysis, use the "Edit Optimization Config" or
          "Edit Suggestions Config" actions for your collection.
          <br /> <br />
          <img src={histOption} alt="History" />
        </StepsItem>
      </Steps>
      <Button
        onClick={() => dismissQuickStart()}
        sizeType={Button.SIZE_TYPE.SMALL}
        loading={dismissing}
      >
        Close
      </Button>
      <br />
      <br />
      <Checkbox
        onChange={e => setDontShowAgain(e.checked)}
        checked={dontShowAgain}
        label="Don't show me this guide again"
      />
    </div>
  );
}
