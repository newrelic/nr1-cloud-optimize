import React from 'react';
import { Form, Header } from 'semantic-ui-react';
import { RdsConsumer } from './context';

export default class RulesConfiguration extends React.PureComponent {
  render() {
    return (
      <RdsConsumer>
        {({
          updateDataState,
          rulesCpu,
          rulesConnections,
          rulesStorageUsage
        }) => {
          const setValue = v => {
            if (v === '') {
              return '';
            } else if (v) {
              return isNaN(v) ? 0 : v;
            } else {
              return rulesCpu;
            }
          };

          return (
            <div>
              <Header as="h3" content="Rules" />
              <Form>
                <Form.Group widths="equal">
                  <Form.Input
                    fluid
                    label="Low CPU Usage %"
                    onChange={(e, d) =>
                      updateDataState({ rulesCpu: setValue(d.value, rulesCpu) })
                    }
                    value={rulesCpu}
                  />
                  <Form.Input
                    fluid
                    label="Low Connections"
                    onChange={(e, d) =>
                      updateDataState({
                        rulesConnections: setValue(d.value, rulesConnections)
                      })
                    }
                    value={rulesConnections}
                  />
                  <Form.Input
                    fluid
                    label="Low Storage Use %"
                    onChange={(e, d) =>
                      updateDataState({
                        rulesStorageUsage: setValue(d.value, rulesStorageUsage)
                      })
                    }
                    value={rulesStorageUsage}
                  />
                </Form.Group>
              </Form>
            </div>
          );
        }}
      </RdsConsumer>
    );
  }
}
