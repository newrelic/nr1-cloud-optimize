/* eslint-disable react/no-did-update-set-state */
import React from 'react';
import PropTypes from 'prop-types';

import {
  Divider,
  Form,
  Icon,
  Input,
  Modal,
  Menu,
  Dropdown,
  Button
} from 'semantic-ui-react';
// import debounce from 'lodash.debounce';
import { deleteDocument } from '../lib/utils';

import { defaultUserConfig } from '../lib/constants';

export default class Config extends React.Component {
  static propTypes = {
    config: PropTypes.object,
    onUserConfigChange: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {
      config: defaultUserConfig()
    };
    this.handleConfigurator = this.handleConfigurator.bind(this);
    this.onUserConfigChange = this.props.onUserConfigChange;
    // this.debouncedUserConfigChange = debounce(
    //   this.props.onUserConfigChange,
    //   500
    // );
  }

  componentDidUpdate(prevProps) {
    // TO DO - Do we need a deep comparison here?
    if (prevProps.config !== this.props.config) {
      this.setState({ config: this.props.config });
    }
  }

  async handleConfigurator(e, data, type) {
    const { config } = this.state;

    const tempConfig = {};
    if (!isNaN(data.value)) {
      tempConfig[type] = data.value;
    } else {
      tempConfig[type] = type.includes('stale') ? 0 : 1;
    }

    this.setState(
      {
        config: {
          ...config,
          ...tempConfig
        }
      },
      () =>
        this.onUserConfigChange({
          config: this.state.config,
          trigger: 'recalc'
        })
    );
  }

  handleAddition = async (e, { value }) => {
    const { config } = this.state;

    this.setState(
      prevState => ({
        config: {
          ...config,
          instanceOptions: [
            { text: value, value },
            ...prevState.config.instanceOptions
          ]
        }
      }),
      () => this.onUserConfigChange({ config: this.state.config })
    );
  };

  handleChange = async (e, { value }) => {
    const { config } = this.state;
    this.setState(
      {
        config: {
          ...config,
          instanceOptionsCurrent: value
        }
      },
      () =>
        this.onUserConfigChange({
          config: this.state.config,
          trigger: 'recalc'
        })
    );
  };

  render() {
    const labelWidth = '230px';
    return (
      <Modal
        size="small"
        trigger={
          this.props.button ? (
            <Button
              className="filter-button"
              icon="cog"
              content="Configuration"
            />
          ) : (
            <Menu.Item>
              Configuration &nbsp;
              <Icon name="cog" />
            </Menu.Item>
          )
        }
      >
        <Modal.Header>Advanced Configuration</Modal.Header>
        <Modal.Content className="config config-dark">
          <Form inverted={false}>
            <Form.Field inline>
              <label style={{ width: labelWidth }}>
                Inclusion Period (hours)
              </label>
              <Input
                inverted={false}
                value={this.state.config.lastReportPeriod}
                onChange={(e, data) => {
                  this.handleConfigurator(e, data, 'lastReportPeriod');
                }}
              />
            </Form.Field>
            <label>
              Instance needs to have reported at least once within this period.
            </label>
            <Divider />

            <Form.Field inline>
              <label style={{ width: labelWidth }}>Discount Multiplier</label>
              <Input
                inverted={false}
                value={this.state.config.discountMultiplier}
                onChange={(e, data) => {
                  this.handleConfigurator(e, data, 'discountMultiplier');
                }}
              />
            </Form.Field>
            <label>
              Factor any discounts in such as EDP, eg. 0.9 equals 10% discount.
            </label>
            <Divider />

            <Form.Field inline>
              <label style={{ width: labelWidth }}>Stale Instance CPU %</label>
              <Input
                inverted={false}
                value={this.state.config.staleInstanceCpu}
                onChange={(e, data) => {
                  this.handleConfigurator(e, data, 'staleInstanceCpu');
                }}
              />
            </Form.Field>
            <Form.Field inline>
              <label style={{ width: labelWidth }}>
                Stale Instance Memory %
              </label>
              <Input
                inverted={false}
                value={this.state.config.staleInstanceMem}
                onChange={(e, data) => {
                  this.handleConfigurator(e, data, 'staleInstanceMem');
                }}
              />
            </Form.Field>
            <Form.Field inline>
              <label style={{ width: labelWidth }}>
                Stale Transmit Bytes/s
              </label>
              <Input
                inverted={false}
                value={this.state.config.staleTransmitBytesPerSecond}
                onChange={(e, data) => {
                  this.handleConfigurator(
                    e,
                    data,
                    'staleTransmitBytesPerSecond'
                  );
                }}
              />
            </Form.Field>
            <Form.Field inline>
              <label style={{ width: labelWidth }}>Stale Receive Bytes/s</label>
              <Input
                inverted={false}
                value={this.state.config.staleReceiveBytesPerSecond}
                onChange={(e, data) => {
                  this.handleConfigurator(
                    e,
                    data,
                    'staleReceiveBytesPerSecond'
                  );
                }}
              />
            </Form.Field>
            <label>
              Automatically class instances as stale using max values. Anything
              set to 0 will disable the stale check.
            </label>
            <Divider />

            <Form.Field>
              <label style={{ width: labelWidth }}>Instance Type Filter</label>

              <Dropdown
                options={this.state.config.instanceOptions}
                placeholder=""
                search
                selection
                fluid
                multiple
                allowAdditions
                value={this.state.config.instanceOptionsCurrent}
                onAddItem={this.handleAddition}
                onChange={this.handleChange}
              />
            </Form.Field>
            <label>Filter instance types out, eg. &quot;t2&quot;.</label>
            <Divider />

            <Form.Field inline>
              <label style={{ width: labelWidth }}>Right Size CPU %</label>
              <Input
                inverted={false}
                value={this.state.config.rightSizeCpu}
                onChange={(e, data) => {
                  this.handleConfigurator(e, data, 'rightSizeCpu');
                }}
              />
            </Form.Field>
            <Form.Field inline>
              <label style={{ width: labelWidth }}>Right Size Memory %</label>
              <Input
                inverted={false}
                value={this.state.config.rightSizeMem}
                onChange={(e, data) => {
                  this.handleConfigurator(e, data, 'rightSizeMem');
                }}
              />
            </Form.Field>
            <label>
              The instance(s) that get dynamically selected for right sizing can
              be tuned here.
            </label>
          </Form>
        </Modal.Content>

        <Modal.Actions>
          <Button
            onClick={async () => {
              await deleteDocument('cloudOptimizeCfg', 'main');
              location.reload();
            }}
            negative
          >
            Reset to defaults
          </Button>
        </Modal.Actions>
      </Modal>
    );
  }
}
