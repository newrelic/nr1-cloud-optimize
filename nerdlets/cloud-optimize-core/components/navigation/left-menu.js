import React from 'react';
import { Menu } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';

export default class LeftMenu extends React.PureComponent {
  state = { activeIndex: 1 };

  handleClick = (e, titleProps) => {
    const { index } = titleProps;
    const { activeIndex } = this.state;
    const newIndex = activeIndex === index ? -1 : index;

    this.setState({ activeIndex: newIndex });
  };

  render() {
    const { height } = this.props;

    return (
      <DataConsumer>
        {({ selectedPage, updateDataState }) => {
          // const isLoading = fetchingEntities || postProcessing;

          const menuItem = (name, val, icon) => {
            return (
              <Menu.Item
                style={{
                  fontSize: '13px'
                }}
                icon={icon || 'circle thin'}
                name={name}
                active={selectedPage === val}
                onClick={() => updateDataState({ selectedPage: val })}
              />
            );
          };

          return (
            <Menu
              vertical
              pointing
              style={{
                backgroundColor: 'white',
                height: height,
                marginTop: 0
              }}
            >
              <Menu.Item>
                <Menu.Menu>{menuItem('Home', 'home', 'home')}</Menu.Menu>
                <Menu.Menu>{menuItem('Setup', 'setup', 'cog')}</Menu.Menu>
                <Menu.Menu>
                  {menuItem(
                    'Optimization Configs',
                    'optimization-configs',
                    'configure'
                  )}
                </Menu.Menu>
                <Menu.Menu>
                  {menuItem('Workload Costs', 'workload-costs')}
                </Menu.Menu>
                {/* <Menu.Header>Getting Started</Menu.Header> */}
                <Menu.Menu>{menuItem('FAQ', 'faq', 'help')}</Menu.Menu>
              </Menu.Item>
            </Menu>
          );
        }}
      </DataConsumer>
    );
  }
}
