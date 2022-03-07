import React from 'react';
import CssLoader from './cssLoader';

export default class Loader extends React.Component {
  render() {
    const { message, loader, reduceHeight } = this.props;
    const height =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;

    return (
      <>
        <div
          className="flex-center"
          style={{ height: height - (reduceHeight || 50) }}
        >
          <CssLoader loader={loader} />
          <br />
          &nbsp;
          <span style={{ fontSize: '20px' }}>{message}</span>
        </div>
      </>
    );
  }
}
