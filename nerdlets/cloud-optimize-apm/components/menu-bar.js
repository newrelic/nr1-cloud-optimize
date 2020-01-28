import React from 'react';
import PropTypes from 'prop-types';

import { getDocument, writeDocument } from '../../shared/lib/utils';
import { Statistic } from 'semantic-ui-react';
import PricingSelector from '../../shared/components/pricingSelector';
import Config from '../../shared/components/config';
import { defaultUserConfig } from '../../shared/lib/constants';

export default class MenuBar extends React.Component {
  static propTypes = {
    totals: PropTypes.object,
    onUserConfigChange: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.state = {
      userConfig: null,
      defaultConfig: defaultUserConfig()
    };
    this.handleOptimize = this.handleOptimize.bind(this);
    this.onUserConfigChange = this.onUserConfigChange.bind(this);
  }

  async componentDidMount() {
    await this.initialize();
  }

  async initialize() {
    await this.intializeUserConfig();
  }

  async intializeUserConfig() {
    return new Promise(resolve => {
      getDocument('cloudOptimizeCfg', 'main').then(async data => {
        let currentConfig = data;
        const { defaultConfig } = this.state;

        if (currentConfig) {
          // needed for backwards compatibility before multicloud support
          if (!currentConfig.cloudData) {
            // console.log("cloudData was not available in config, injecting defaults")
            currentConfig.cloudData = {
              ...defaultConfig.cloudData
            };
          }
        }

        if (!currentConfig) {
          currentConfig = defaultConfig;
        }

        await this.onUserConfigChange({ config: currentConfig });
        resolve();
      });
    });
  }

  // Persist config updates to UserStorage (aka NerdStore)
  async onUserConfigChange({ config, trigger }) {
    if (!config) {
      console.error('Config is empty');
      throw new Error('Attempting to save empty config');
    }

    await writeDocument('cloudOptimizeCfg', 'main', config);
    this.setState({ userConfig: config });
    this.props.onUserConfigChange({ config, trigger });
  }

  async onPricingChange({ config }) {
    await this.onUserConfigChange({ config, trigger: 'recalc' });
  }

  async handleOptimize(e) {
    const { userConfig } = this.state;
    userConfig.optimizeBy = e.target.value;
    await this.onUserConfigChange({ config: userConfig, trigger: 'recalc' });
  }

  render() {
    const { userConfig } = this.state;
    const { totals } = this.props;
    const optimizedPerc =
      (totals.optimizedCount /
        (totals.nonOptimizedCount + totals.optimizedCount)) *
      100;
    const savings = `$${(totals.saving * 720 * 12)
      .toFixed(2)
      .replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;

    return (
      <div className="utility-bar">
        {/* <Button className="filter-button" icon="chart line" content="View" style={{float:"left"}}/> */}

        <div
          style={{
            backgroundColor: '#fafbfb',
            height: '45px',
            borderRadius: '3px',
            paddingLeft: '15px',
            paddingRight: '15px',
            marginTop: '10px',
            marginBottom: '10px'
          }}
        >
          <Statistic
            size="small"
            horizontal
            label="Optimized"
            value={`${isNaN(optimizedPerc) ? '0' : optimizedPerc}%`}
            style={{ marginTop: '7px' }}
          />
        </div>

        <div
          className="statistic-menu-bar-wrapper"
          style={{
            backgroundColor: '#fafbfb',
            height: '45px',
            borderRadius: '3px',
            paddingLeft: '15px',
            paddingRight: '15px',
            marginTop: '10px',
            marginBottom: '10px'
          }}
        >
          <Statistic
            size="small"
            horizontal
            label="Potential Yearly Saving"
            value={savings}
            style={{ marginTop: '7px' }}
          />
        </div>

        <div className="flex-push" />

        {userConfig && (
          <>
            <div className="config-optimize-by-header-wrapper">
              <span className="config-optimize-by-header">
                &nbsp;&nbsp;Optimize By: {userConfig.optimizeBy}%&nbsp;
              </span>
            </div>

            <div className="config-optimize-by-input-wrapper">
              <input
                className="config-optimize-by-input"
                type="range"
                max="80"
                step="1"
                min="10"
                value={userConfig.optimizeBy}
                onChange={this.handleOptimize}
              />
            </div>

            <Config
              button
              config={userConfig}
              onUserConfigChange={this.onUserConfigChange}
            />

            <PricingSelector
              button
              config={userConfig}
              onUserConfigChange={this.onUserConfigChange}
              onPricingChange={this.onPricingChange}
            />
          </>
        )}
      </div>
    );
  }
}
