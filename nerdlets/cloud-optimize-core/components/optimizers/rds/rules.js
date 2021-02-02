import React from 'react';
import { Form, Button, Header } from 'semantic-ui-react';
import { RdsConsumer } from './context';
import { writeDocument } from '../../../../shared/lib/utils';

export default class RulesConfiguration extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isSaving: false
    };
  }

  saveDocument = rules => {
    this.setState({ isSaving: true }, async () => {
      await writeDocument('rdsOptimizationConfig', 'main', rules);
      this.setState({ isSaving: false });
    });
  };

  render() {
    return (
      <RdsConsumer>
        {({ updateDataState, rules }) => {
          const setValue = v => {
            if (v === '') {
              return '';
            } else if (v) {
              return isNaN(v) ? 0 : v;
            } else {
              return v;
            }
          };

          const updateRule = (key, value) => {
            rules[key] = value;
            updateDataState({ rules: { ...rules } });
          };

          return (
            <div>
              <Header as="h3" content="Rules" />
              <Form>
                <Form.Group widths="equal">
                  <Form.Input
                    fluid
                    label="Low CPU Usage %"
                    onChange={(e, d) => updateRule('cpu', setValue(d.value))}
                    value={rules.cpu}
                  />
                  <Form.Input
                    fluid
                    label="Low Connections"
                    onChange={(e, d) =>
                      updateRule('connections', setValue(d.value))
                    }
                    value={rules.connections}
                  />
                  <Form.Input
                    fluid
                    label="Low Storage Use %"
                    onChange={(e, d) =>
                      updateRule('storageUsage', setValue(d.value))
                    }
                    value={rules.storageUsage}
                  />
                </Form.Group>
                <Button
                  compact
                  style={{ float: 'right' }}
                  content="Save configuration"
                  icon="save"
                  color="green"
                  onClick={() => this.saveDocument(rules)}
                  loading={this.state.isSaving}
                />
              </Form>
            </div>
          );
        }}
      </RdsConsumer>
    );
  }
}
