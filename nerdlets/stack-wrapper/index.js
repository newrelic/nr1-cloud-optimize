import React from 'react';
import { navigation } from 'nr1';

// https://docs.newrelic.com/docs/new-relic-programmable-platform-introduction

export default class StackWrapperNerdlet extends React.Component {
  render() {
    navigation.openStackedNerdlet({ id: 'workloads.create' });

    return <></>;
  }
}
