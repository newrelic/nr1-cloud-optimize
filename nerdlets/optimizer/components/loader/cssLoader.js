import React from "react";

export default class CssLoader extends React.Component {
  render() {
    const { loader } = this.props;

    if (loader === "lds-ripple") {
      return (
        <div className="lds-ripple">
          <div></div>
          <div></div>
        </div>
      );
    }

    if (!loader || loader === "lds-ring") {
      return (
        <div className="lds-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      );
    }

    if (!loader || loader === "lds-facebook") {
      return (
        <div className="lds-facebook">
          <div></div>
          <div></div>
          <div></div>
        </div>
      );
    }
  }
}
