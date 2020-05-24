import React from 'react';
import { DataConsumer, optimizationDefaults } from '../../context/data';
import {
  Menu,
  Segment,
  Message,
  Header,
  Form,
  Divider,
  Button,
  Dropdown,
  Radio
} from 'semantic-ui-react';
import {
  writeDocument,
  writeAccountDocument,
  writeEntityDocument
} from '../../../shared/lib/utils';

export default class OptimizationConfigs extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      activeItem: 'user',
      updating: false,
      selectedAccount: null,
      selectedWorkload: null
    };
  }

  handleItemClick = (e, { name }) => {
    const reset = {};
    Object.keys(optimizationDefaults).forEach(key => {
      reset[key] = null;
    });
    this.setState({ activeItem: name, ...reset });
  };

  updateExcludedGuid = (guid, checked, excludedGuids) => {
    if (checked) {
      excludedGuids.push(guid);
    } else {
      for (let z = 0; z < excludedGuids.length; z++) {
        if (excludedGuids[z] === guid) {
          excludedGuids.splice(z, 1);
          break;
        }
      }
    }

    this.setState({ excludedGuids: [...excludedGuids] });
  };

  saveDocument = (
    updateDataState,
    postProcessEntities,
    enable,
    inclusionPeriodHours,
    cpuUpper,
    memUpper,
    cpuMemUpperOperator,
    cpuMemUpperStaleOperator,
    staleCpu,
    staleMem,
    staleReceiveBytesPerSec,
    staleTransmitBytesPerSec,
    memRightSize,
    cpuRightSize,
    includedInstanceTypes,
    excludedInstanceTypes,
    excludedGuids
  ) => {
    const { activeItem, selectedAccount, selectedWorkload } = this.state;
    const valueCheck = (val, name) => {
      if (val !== null && val !== undefined) return val;
      return optimizationDefaults[name];
    };

    const payload = {
      enable: enable || optimizationDefaults.enable,
      inclusionPeriodHours: parseFloat(
        inclusionPeriodHours || optimizationDefaults.inclusionPeriodHours
      ),
      cpuUpper: parseFloat(valueCheck(cpuUpper, 'cpuUpper')),
      memUpper: parseFloat(valueCheck(memUpper, 'memUpper')),
      staleCpu: parseFloat(valueCheck(staleCpu, 'staleCpu')),
      staleMem: parseFloat(valueCheck(staleMem, 'staleMem')),
      cpuMemUpperOperator:
        cpuMemUpperOperator || optimizationDefaults.cpuMemUpperOperator,
      cpuMemUpperStaleOperator:
        cpuMemUpperStaleOperator ||
        optimizationDefaults.cpuMemUpperStaleOperator,
      staleReceiveBytesPerSec: parseFloat(
        valueCheck(staleReceiveBytesPerSec, 'staleReceiveBytesPerSec')
      ),
      staleTransmitBytesPerSec: parseFloat(
        valueCheck(staleTransmitBytesPerSec, 'staleTransmitBytesPerSec')
      ),
      cpuRightSize: parseFloat(valueCheck(cpuRightSize, 'cpuRightSize')),
      memRightSize: parseFloat(valueCheck(memRightSize, 'memRightSize')),
      excludedInstanceTypes:
        excludedInstanceTypes || optimizationDefaults.excludedInstanceTypes,
      includedInstanceTypes:
        includedInstanceTypes || optimizationDefaults.includedInstanceTypes,
      excludedGuids: excludedGuids || optimizationDefaults.excludedGuids
    };

    this.setState({ updating: true }, async () => {
      if (activeItem === 'user') {
        await writeDocument('optimizationConfig', 'main', payload);
        updateDataState({ userConfig: payload });
      } else if (activeItem === 'account') {
        await writeAccountDocument(
          selectedAccount.value,
          'optimizationConfig',
          'main',
          payload
        );
      } else if (activeItem === 'workload') {
        await writeEntityDocument(
          selectedWorkload.value,
          'optimizationConfig',
          'main',
          payload
        );
      }

      this.setState({ updating: false }, () => {
        postProcessEntities();
      });
    });
  };

  handleUpdate = (e, d) => {
    this.setState({ [d.id]: d.value });
  };

  handleAddition = async (e, d, arr) => {
    const temp = [...arr];
    const exists = temp.filter(v => v.text === d.value);
    if (!exists[0]) temp.push({ text: d.value, value: d.value });
    this.setState({ [d.id]: temp });
  };

  handleChange = async (e, d) => {
    const temp = d.value.map(v => ({
      text: v,
      value: v
    }));
    this.setState({ [d.id]: temp });
  };

  render() {
    const {
      activeItem,
      updating,
      selectedAccount,
      selectedWorkload
    } = this.state;

    return (
      <DataConsumer>
        {({
          userConfig,
          accounts,
          workloadEntities,
          postProcessEntities,
          updateDataState
        }) => {
          let cfg = userConfig;
          if (activeItem === 'user') {
            cfg = userConfig;
          } else if (activeItem === 'account' && selectedAccount) {
            const acc = accounts.filter(a => a.id === selectedAccount.value)[0];
            if (acc) {
              cfg = acc.optimizationConfig || { ...optimizationDefaults };
            }
          } else if (activeItem === 'workload' && selectedWorkload) {
            const wl = accounts.filter(
              w => w.guid === selectedWorkload.value
            )[0];
            if (wl) {
              cfg = wl.optimizationConfig || { ...optimizationDefaults };
            }
          } else {
            cfg = { ...optimizationDefaults };
          }

          const accountOptions = accounts.map(acc => ({
            key: acc.id,
            text: acc.name,
            value: acc.id
          }));

          const workloadOptions = (workloadEntities || []).map(w => ({
            key: w.guid,
            text: w.name,
            value: w.guid
          }));

          const handleValue = name => {
            if (this.state[name] !== null && this.state[name] !== undefined) {
              return this.state[name];
            }

            const cfgValue = (cfg || {})[name] || null;
            if (cfgValue !== undefined && cfgValue !== null) {
              return cfgValue;
            }

            return optimizationDefaults[name];
          };

          const enable = handleValue('enable');
          const cpuUpper = handleValue('cpuUpper');
          const memUpper = handleValue('memUpper');
          const staleCpu = handleValue('staleCpu');
          const staleMem = handleValue('staleMem');
          const staleReceiveBytesPerSec = handleValue(
            'staleReceiveBytesPerSec'
          );
          const staleTransmitBytesPerSec = handleValue(
            'staleTransmitBytesPerSec'
          );
          const cpuMemUpperOperator = handleValue('cpuMemUpperOperator');
          const cpuMemUpperStaleOperator = handleValue(
            'cpuMemUpperStaleOperator'
          );
          const inclusionPeriodHours = handleValue('inclusionPeriodHours');
          const cpuRightSize = handleValue('cpuRightSize');
          const memRightSize = handleValue('memRightSize');
          const excludedInstanceTypes = handleValue('excludedInstanceTypes');
          const excludedInstanceOptions = excludedInstanceTypes.map(
            d => d.value
          );
          const includedInstanceTypes = handleValue('includedInstanceTypes');

          const excludedGuids = handleValue('excludedGuids');

          //   const optimizedCfgEnabled = (cfg || {}).enable || false;

          const saveDisabled =
            (activeItem === 'account' && !selectedAccount) ||
            (activeItem === 'workload' && !selectedWorkload);

          return (
            <>
              <Header as="h3" content="Optimization Configuration" />
              <Message>
                <Message.Header>
                  Adjust your optimization results
                </Message.Header>
                <Message.List>
                  <Message.Item>
                    There are 3 optimization options available - User, Account,
                    Workload.
                  </Message.Item>
                  <Message.Item>
                    If the entity exists within a Workload this configuration
                    will take precedence, followed by Account and finally User.
                  </Message.Item>
                </Message.List>
              </Message>

              <Menu pointing secondary>
                <Menu.Item
                  name="user"
                  active={activeItem === 'user'}
                  onClick={this.handleItemClick}
                />
                <Menu.Item
                  name="account"
                  active={activeItem === 'account'}
                  onClick={this.handleItemClick}
                />
                <Menu.Item
                  name="workload"
                  active={activeItem === 'workload'}
                  onClick={this.handleItemClick}
                />
              </Menu>

              <Segment
                style={{
                  margin: '8px'
                }}
                raised
              >
                <Form style={{ padding: '10px' }}>
                  <Form.Group
                    style={{ display: activeItem === 'account' ? '' : 'none' }}
                  >
                    <Form.Field>
                      <label>Select Account</label>
                      <Dropdown
                        className="singledrop"
                        placeholder="Select Account"
                        search
                        selection
                        options={accountOptions}
                        onChange={(e, d) =>
                          this.setState({ selectedAccount: d })
                        }
                      />
                    </Form.Field>
                  </Form.Group>
                  <Form.Group
                    style={{ display: activeItem === 'workload' ? '' : 'none' }}
                  >
                    <Form.Field>
                      <label>Select Workload</label>
                      <Dropdown
                        className="singledrop"
                        placeholder="Select Workload"
                        search
                        selection
                        options={workloadOptions}
                        onChange={(e, d) =>
                          this.setState({ selectedWorkload: d })
                        }
                      />
                    </Form.Field>
                  </Form.Group>
                  <Form.Field inline>
                    <label style={{ width: '230px' }}>
                      Inclusion Period (hours)
                    </label>
                    <Form.Input
                      id="inclusionPeriodHours"
                      inverted={false}
                      value={inclusionPeriodHours}
                      onChange={this.handleUpdate}
                    />
                  </Form.Field>
                  <label>
                    The instance needs to have reported at least once within
                    this period.
                  </label>
                  <Divider />

                  <Form.Group widths={4}>
                    <Form.Input
                      label="CPU Percent"
                      value={cpuUpper}
                      id="cpuUpper"
                      onChange={this.handleUpdate}
                      type="number"
                    />
                    <Form.Select
                      label="Operator"
                      id="cpuMemUpperOperator"
                      value={cpuMemUpperOperator}
                      options={[
                        {
                          key: 'AND',
                          text: 'AND',
                          value: 'AND'
                        },
                        {
                          key: 'OR',
                          text: 'OR',
                          value: 'OR'
                        }
                      ]}
                      onChange={this.handleUpdate}
                    />
                    <Form.Input
                      label="Memory Percent"
                      value={memUpper}
                      id="memUpper"
                      onChange={this.handleUpdate}
                      type="number"
                    />
                  </Form.Group>
                  <label>
                    If the instance is below any of these metrics, provide an
                    optimized suggestion. Setting as 0 will disable the check.
                  </label>
                  <Divider />

                  <Form.Group widths="equal">
                    <Form.Input
                      label="CPU Percent"
                      value={staleCpu}
                      id="staleCpu"
                      onChange={this.handleUpdate}
                      type="number"
                    />
                    <Form.Select
                      label="Operator"
                      id="cpuMemUpperStaleOperator"
                      value={cpuMemUpperStaleOperator}
                      options={[
                        {
                          key: 'AND',
                          text: 'AND',
                          value: 'AND'
                        },
                        {
                          key: 'OR',
                          text: 'OR',
                          value: 'OR'
                        }
                      ]}
                      onChange={this.handleUpdate}
                    />
                    <Form.Input
                      label="Memory Percent"
                      value={staleMem}
                      id="staleMem"
                      onChange={this.handleUpdate}
                      type="number"
                    />
                    <Form.Input
                      label="Receive Bytes Per Second"
                      value={staleReceiveBytesPerSec}
                      id="staleReceiveBytesPerSec"
                      onChange={this.handleUpdate}
                      type="number"
                    />
                    <Form.Input
                      label="Transmit Bytes Per Second"
                      value={staleTransmitBytesPerSec}
                      id="staleTransmitBytesPerSec"
                      onChange={this.handleUpdate}
                      type="number"
                    />
                  </Form.Group>
                  <label>
                    If the instance is below any of these metrics mark as stale.
                    Setting as 0 will disable the check.
                  </label>
                  <Divider />

                  <Form.Field>
                    <label>Exclude Instance Types</label>
                    <Dropdown
                      // style={{ position: 'relative' }}
                      id="excludedInstanceTypes"
                      search
                      selection
                      fluid
                      multiple
                      allowAdditions
                      value={excludedInstanceOptions}
                      options={excludedInstanceTypes}
                      onChange={this.handleChange}
                      onAddItem={(e, d) =>
                        this.handleAddition(e, d, excludedInstanceTypes)
                      }
                    />
                  </Form.Field>
                  <label>Filter instance types out, eg. &quot;t2&quot;.</label>

                  <Divider />

                  <Form.Group widths={4}>
                    <Form.Input
                      label="Right Size CPU %"
                      value={cpuRightSize}
                      id="cpuRightSize"
                      onChange={this.handleUpdate}
                      type="number"
                    />
                    <Form.Input
                      label="Right Size Memory %"
                      value={memRightSize}
                      id="memRightSize"
                      onChange={this.handleUpdate}
                      type="number"
                    />
                  </Form.Group>
                  <label>
                    Based on these values, the instance CPU and Memory will be
                    multiplied respectively to determine a new instance type.
                    Given it becomes an optimization candidate.
                  </label>
                </Form>

                <div style={{ padding: '10px' }}>
                  <Radio
                    style={{ paddingTop: '7px' }}
                    toggle
                    label="Enable configuration"
                    checked={enable}
                    onChange={() => this.setState({ enable: !enable })}
                  />
                  <Button
                    compact
                    style={{ float: 'right' }}
                    content="Save configuration"
                    icon="save"
                    color="green"
                    loading={updating}
                    disabled={saveDisabled}
                    onClick={() =>
                      this.saveDocument(
                        updateDataState,
                        postProcessEntities,
                        enable,
                        inclusionPeriodHours,
                        cpuUpper,
                        memUpper,
                        cpuMemUpperOperator,
                        cpuMemUpperStaleOperator,
                        staleCpu,
                        staleMem,
                        staleReceiveBytesPerSec,
                        staleTransmitBytesPerSec,
                        memRightSize,
                        cpuRightSize,
                        includedInstanceTypes,
                        excludedInstanceTypes,
                        excludedGuids
                      )
                    }
                  />
                </div>
              </Segment>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
