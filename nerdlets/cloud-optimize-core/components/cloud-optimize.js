import React from 'react';
import MenuBar from './navigation/menu-bar';
import LeftMenu from './navigation/left-menu';
import ContentContainer from './navigation/content-container';

export default class CloudOptimize extends React.Component {
  render() {
    const { height } = this.props;
    return (
      <div style={{ minWidth: "665px" }}>
        <MenuBar />
        <div style={{ float: 'left' }}>
          <LeftMenu height={height} />
        </div>
        <div>
          <ContentContainer height={height} />
        </div>
      </div>
    );
  }
}
