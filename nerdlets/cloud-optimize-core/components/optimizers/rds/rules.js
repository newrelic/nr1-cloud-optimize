import React from 'react';
import { Form, Header, Icon, Message } from 'semantic-ui-react';
import { RdsConsumer } from './context';
import { writeDocument } from '../../../../shared/lib/utils';
import { DataConsumer } from '../../../context/data';

export default class RulesConfiguration extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isSaving: false,
      showRules: false
    };
  }

  saveDocument = rules => {
    this.setState({ isSaving: true }, async () => {
      await writeDocument('rdsOptimizationConfig', 'main', rules);
      this.setState({ isSaving: false });
    });
  };

  render() {
    const { showRules } = this.state;

    return (
      <DataConsumer>
        {({ storeState }) => {
          return (
            <RdsConsumer>
              {({ updateDataState, rules, fetchEntities }) => {
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
                    <Header
                      style={{ cursor: 'pointer' }}
                      as="h3"
                      onClick={() => this.setState({ showRules: !showRules })}
                    >
                      {this.state.showRules ? (
                        <Icon name="toggle on" />
                      ) : (
                        <Icon name="toggle off" />
                      )}
                      {this.state.showRules ? ' Hide Rules' : ' Show Rules'}
                    </Header>
                    <Message
                      style={{ display: this.state.showRules ? '' : 'none' }}
                    >
                      Disable rules by setting 0.
                    </Message>
                    <Form
                      style={{ display: this.state.showRules ? '' : 'none' }}
                    >
                      <Form.Group widths="equal">
                        <Form.Input
                          fluid
                          label="Low CPU Usage %"
                          onChange={(e, d) =>
                            updateRule('cpu', setValue(d.value))
                          }
                          value={rules.cpu}
                        />
                        <Form.Input
                          fluid
                          label="Low Memory Usage %"
                          onChange={(e, d) =>
                            updateRule('memory', setValue(d.value))
                          }
                          value={rules.memory}
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
                      <Form.Group widths="equal">
                        <Form.Input
                          fluid
                          label="Stale CPU  %"
                          onChange={(e, d) =>
                            updateRule('cpuStale', setValue(d.value))
                          }
                          value={rules.cpuStale}
                        />
                        <Form.Input
                          fluid
                          label="Stale Memory Usage %"
                          onChange={(e, d) =>
                            updateRule('memoryStale', setValue(d.value))
                          }
                          value={rules.memoryStale}
                        />
                        <Form.Input
                          fluid
                          label="Stale Connections"
                          onChange={(e, d) =>
                            updateRule('connectionsStale', setValue(d.value))
                          }
                          value={rules.connectionsStale}
                        />
                        <Form.Input
                          fluid
                          label="Stale Storage Use %"
                          onChange={(e, d) =>
                            updateRule('storageUsageStale', setValue(d.value))
                          }
                          value={rules.storageUsageStale}
                        />
                      </Form.Group>
                      <Form.Group>
                        <Form.Input
                          width="4"
                          fluid
                          label="Stale Network TX Bytes"
                          onChange={(e, d) =>
                            updateRule('txStale', setValue(d.value))
                          }
                          value={rules.txStale}
                        />
                        <Form.Input
                          width="4"
                          fluid
                          label="Stale Network RX Bytes"
                          onChange={(e, d) =>
                            updateRule('rxStale', setValue(d.value))
                          }
                          value={rules.rxStale}
                        />
                        <Form.Input
                          width="4"
                          fluid
                          label="Stale Read Throughput Bytes  %"
                          onChange={(e, d) =>
                            updateRule('readStale', setValue(d.value))
                          }
                          value={rules.readStale}
                        />
                        <Form.Input
                          width="4"
                          fluid
                          label="Stale Write Throughput Bytes  %"
                          onChange={(e, d) =>
                            updateRule('writeStale', setValue(d.value))
                          }
                          value={rules.writeStale}
                        />
                      </Form.Group>
                      <Form.Group>
                        <Form.Button
                          compact
                          content="Save configuration"
                          icon="save"
                          color="green"
                          onClick={() => this.saveDocument(rules)}
                          loading={this.state.isSaving}
                        />
                        <Form.Button
                          compact
                          content="Refresh Optimizations"
                          icon="refresh"
                          color="blue"
                          onClick={async () => {
                            await storeState({ selectedGroup: null });
                            await updateDataState({
                              fetchingEntities: true
                            });
                            fetchEntities();
                          }}
                          loading={this.state.isSaving}
                        />
                      </Form.Group>
                    </Form>
                    <br />
                  </div>
                );
              }}
            </RdsConsumer>
          );
        }}
      </DataConsumer>
    );
  }
}
