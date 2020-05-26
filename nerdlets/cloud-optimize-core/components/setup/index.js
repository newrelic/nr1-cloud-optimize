import React from 'react';
import { Message, Header } from 'semantic-ui-react';

export default class Setup extends React.PureComponent {
  render() {
    return (
      <>
        <Header as="h3" content="Setup" />
        <Message>
          <Message.Header>Instance Optimizer</Message.Header>
          <Message.List>
            <Message.Item>
              Deploy the New Relic Infrastructure Agent across your environment.
            </Message.Item>
            <Message.Item>
              For VMware environments setup the vSphere integration as an
              agentless option.
            </Message.Item>
            <Message.Item>
              Install the relevant cloud integrations to have their tagging
              available for filtering.
            </Message.Item>
            <Message.Item>
              To assign costs to non public cloud servers and instances place
              them into a workload.
            </Message.Item>
            <Message.Item>
              See optimization configs to adjust the optimized results returned.
            </Message.Item>
          </Message.List>
        </Message>
      </>
    );
  }
}
