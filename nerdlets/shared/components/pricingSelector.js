import React from 'react';
import PropTypes from 'prop-types';

import { Dropdown, Modal, Menu, Form, Button } from 'semantic-ui-react';

export default class PricingSelector extends React.Component {
  static propTypes = {
    config: PropTypes.object,
    onPricingChange: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {
      cloudData: {
        amazon: null,
        azure: null,
        google: null
      },
      cloudRegions: {
        amazon: [],
        azure: [],
        google: []
      }
    };
    this.handleConfigurator = this.handleConfigurator.bind(this);
    this.fetchCloudPricing = this.fetchCloudPricing.bind(this);
  }

  async componentDidMount() {
    await this.initialize();
  }

  async initialize() {
    await this.fetchCloudPricing();
  }

  async handleConfigurator(e, data, type) {
    const newConfig = this.props.config;
    if (data.value && data.name) {
      newConfig.cloudData[data.name] = data.value;
      await this.fetchCloudPricing(newConfig);
      this.props.onPricingChange({ config: newConfig });
    }
  }

  fetchCloudPricing(cfg) {
    const { cloudData, cloudRegions } = this.state;
    const { config } = this.props;

    if (cfg) {
      config = { ...cfg };
    }

    return new Promise(resolve => {
      const cloudPromises = Object.keys(config.cloudData).map(cloud => {
        return new Promise(resolve => {
          fetch(
            `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/${cloud}/regions.json`
          )
            .then(response => {
              return response.json();
            })
            .then(myJson => {
              cloudRegions[cloud] = myJson;
            });

          fetch(
            `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/${cloud}/compute/pricing/${config.cloudData[cloud]}.json`
          )
            .then(response => {
              return response.json();
            })
            .then(myJson => {
              myJson.cloud = cloud;
              resolve(myJson);
            });
        });
      });

      Promise.all(cloudPromises).then(async results => {
        results.forEach(result => {
          cloudData[result.cloud] = result.products;
        });
        await this.setState({ cloudData, cloudRegions });
        resolve();
      });
    });
  }

  render() {
    const { cloudRegions } = this.state;

    const amazonRegions = cloudRegions.amazon.map(region => {
      return { key: region.name, text: region.name, value: region.id };
    });

    const googleRegions = cloudRegions.google.map(region => {
      return { key: region.name, text: region.name, value: region.id };
    });

    const azureRegions = cloudRegions.azure.map(region => {
      return { key: region.name, text: region.name, value: region.id };
    });

    return (
      <Modal
        trigger={
          this.props.button ? (
            <Button
              className="filter-button"
              icon="cloud"
              content="Set Cloud Regions"
            />
          ) : (
            <Menu.Item>Set Cloud Regions</Menu.Item>
          )
        }
      >
        <Modal.Header>Configure Regions</Modal.Header>
        <Modal.Content>
          <Form inverted={false} style={{ height: '100%' }}>
            <Form.Field>
              <label style={{ width: '100%' }}>AWS Region</label>
              <Dropdown
                options={amazonRegions}
                selection
                fluid
                name="amazon"
                value={this.props.config.cloudData.amazon}
                onChange={this.handleConfigurator}
              />
            </Form.Field>
            <Form.Field>
              <label style={{ width: '100%' }}>Azure Region</label>
              <Dropdown
                options={azureRegions}
                selection
                fluid
                name="azure"
                value={this.props.config.cloudData.azure}
                onChange={this.handleConfigurator}
              />
            </Form.Field>
            <Form.Field>
              <label style={{ width: '100%' }}>Google Region</label>
              <Dropdown
                options={googleRegions}
                selection
                fluid
                name="google"
                value={this.props.config.cloudData.google}
                onChange={this.handleConfigurator}
              />
            </Form.Field>
          </Form>
        </Modal.Content>
      </Modal>
    );
  }
}
