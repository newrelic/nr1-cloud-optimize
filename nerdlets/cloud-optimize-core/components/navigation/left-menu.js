import React from 'react';
import { Menu, Accordion } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';
import Tags from './tags';

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
    const { activeIndex } = this.state;

    return (
      <DataConsumer>
        {({
          selectedPage,
          fetchingEntities,
          postProcessing,
          updateDataState
        }) => {
          const isLoading = fetchingEntities || postProcessing;

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
                {/* <Menu.Header>Getting Started</Menu.Header> */}
                <Menu.Menu>{menuItem('FAQ', 'faq', 'help')}</Menu.Menu>
              </Menu.Item>

              <Menu.Menu style={{ display: isLoading ? 'none' : '' }}>
                <Accordion
                  as={Menu}
                  vertical
                  style={{
                    border: 'none',
                    minHeight: '25px',
                    paddingTop: '0px',
                    paddingLeft: '0px',
                    paddingBottom: '0px',
                    boxShadow: 'none',
                    fontSize: '15px'
                  }}
                >
                  <Menu.Item>
                    <Accordion.Title
                      active={activeIndex === 1}
                      content="Tag Filters"
                      index={1}
                      onClick={this.handleClick}
                      style={{ paddingTop: '0px', paddingBottom: '0px' }}
                    />
                    <Accordion.Content
                      active={activeIndex === 1}
                      content={<Tags height={height} />}
                    />
                  </Menu.Item>
                </Accordion>
              </Menu.Menu>
            </Menu>
          );
        }}
      </DataConsumer>
    );
  }
}
