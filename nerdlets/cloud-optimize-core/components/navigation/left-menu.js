import React from 'react';
import { Menu } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';

export default class LeftMenu extends React.PureComponent {
  state = { activeIndex: 0 };

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
                <Menu.Header>Getting Started</Menu.Header>
                <Menu.Menu>{menuItem('Setup', 'setup', 'cog')}</Menu.Menu>
              </Menu.Item>
            </Menu>
          );
        }}
      </DataConsumer>
    );
  }
}
