import React from 'react';
import { DataConsumer } from '../../context/data';
import { Segment } from 'semantic-ui-react';
import Home from '../home';
import InstanceOptimizer from '../optimizers/instances';

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
              default:
                return selectedPage;
            }
          };

          return (
            <Segment
              style={{
                height,
                overflowY: 'scroll',
                overflowX: 'hidden'
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
