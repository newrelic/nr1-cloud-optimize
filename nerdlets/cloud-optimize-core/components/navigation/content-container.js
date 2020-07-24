import React from 'react';
import { DataConsumer } from '../../context/data';
import { Segment } from 'semantic-ui-react';
import Home from '../home';
import InstanceOptimizer from '../optimizers/instances';
import OptimizationConfigs from '../optimization-configs';
import Setup from '../setup';
import WorkloadCosts from '../workload-costs';
import WorkloadOptimizer from '../optimizers/workloads';
import FAQ from '../faq';

export default class ContentContainer extends React.PureComponent {
  render() {
    const { height } = this.props;
    return (
      <DataConsumer>
        {({ selectedPage }) => {
          const componentSelect = () => {
            switch (selectedPage) {
              case 'home':
                return <Home />;
              case 'instance-optimizer':
                return <InstanceOptimizer />;
              case 'optimization-configs':
                return <OptimizationConfigs />;
              case 'setup':
                return <Setup />;
              case 'workload-costs':
                return <WorkloadCosts />;
              case 'workload-optimizer':
                return <WorkloadOptimizer />;
              case 'faq':
                return <FAQ />;
              default:
                return selectedPage;
            }
          };

          return (
            <Segment
              style={{
                height,
                overflowY: 'scroll',
                overflowX: 'hidden',
                minWidth: '451px'
              }}
            >
              <div
                style={{
                  paddingLeft: '10px',
                  paddingRight: '10px',
                  paddingTop: '10px'
                }}
              >
                {componentSelect()}
              </div>
            </Segment>
          );
        }}
      </DataConsumer>
    );
  }
}
