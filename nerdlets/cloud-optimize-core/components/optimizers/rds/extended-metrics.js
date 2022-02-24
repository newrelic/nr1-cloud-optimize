import React from 'react';
import { Card, Loader } from 'semantic-ui-react';
import { NrqlQuery, LineChart } from 'nr1';
import _ from 'lodash';

export default class ExtendedMetrics extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      cpuChartData: null,
      connChartData: null,
      nwChartData: null,
      rwChartData: null
    };
  }

  async componentDidMount() {
    const { entities } = this.props;
    const accountGroups = _.groupBy(entities, d => d.account.id);
    Object.keys(accountGroups).forEach(id => {
      accountGroups[id] = _.groupBy(accountGroups[id], d => d.type);
    });

    let cpuQuery = `SELECT max(\`provider.cpuUtilization.Average\`) as 'Max CPU utilization (%)' FROM DatastoreSample WHERE provider='RdsDbInstance' TIMESERIES FACET entityName`;
    let connQuery = `SELECT max(\`provider.databaseConnections.Average\`) as 'Max Connections' FROM DatastoreSample WHERE provider='RdsDbInstance' TIMESERIES FACET entityName`;
    let throughputQuery =
      "SELECT max(`provider.networkReceiveThroughput.Average`+`provider.networkTransmitThroughput.Average`) as 'networkBytesPerSecond' FROM DatastoreSample  WHERE provider='RdsDbInstance' TIMESERIES FACET entityName";
    let rwThroughputQuery =
      "SELECT max(`provider.readThroughput.Average`+`provider.writeThroughput.Average`) as 'rwThroughput' FROM DatastoreSample WHERE provider='RdsDbInstance' TIMESERIES FACET entityName";

    const cpuQueryPromises = [];
    const connQueryPromises = [];
    const nwQueryPromises = [];
    const rwQueryPromises = [];

    Object.keys(accountGroups).forEach(id => {
      Object.keys(accountGroups[id]).forEach(type => {
        const guids = `'${accountGroups[id][type]
          .map(e => e.guid)
          .join("','")}'`;
        cpuQuery += ` WHERE entityGuid IN (${guids})`;
        connQuery += ` WHERE entityGuid IN (${guids})`;
        throughputQuery += ` WHERE entityGuid IN (${guids})`;
        rwThroughputQuery += ` WHERE entityGuid IN (${guids})`;

        cpuQueryPromises.push(
          NrqlQuery.query({ accountIds: [id], query: cpuQuery })
        );
        connQueryPromises.push(
          NrqlQuery.query({ accountIds: [id], query: connQuery })
        );
        nwQueryPromises.push(
          NrqlQuery.query({ accountIds: [id], query: throughputQuery })
        );
        rwQueryPromises.push(
          NrqlQuery.query({ accountIds: [id], query: rwThroughputQuery })
        );
      });
    });

    let cpuChartData = [];
    let connChartData = [];
    let nwChartData = [];
    let rwChartData = [];

    const allDataPromises = [
      Promise.all(cpuQueryPromises),
      Promise.all(connQueryPromises),
      Promise.all(nwQueryPromises),
      Promise.all(rwQueryPromises)
    ];

    await Promise.all(allDataPromises).then(d => {
      d.forEach((arr, i) => {
        if (i === 0) {
          arr.forEach(v => {
            if (v.data) {
              cpuChartData = [...cpuChartData, ...v.data];
            }
          });
        } else if (i === 1) {
          arr.forEach(v => {
            if (v.data) {
              connChartData = [...connChartData, ...v.data];
            }
          });
        } else if (i === 2) {
          arr.forEach(v => {
            if (v.data) {
              nwChartData = [...nwChartData, ...v.data];
            }
          });
        } else if (i === 3) {
          arr.forEach(v => {
            if (v.data) {
              rwChartData = [...rwChartData, ...v.data];
            }
          });
        }
      });
    });

    this.setState({ cpuChartData, connChartData, nwChartData, rwChartData });
  }

  render() {
    const {
      cpuChartData,
      connChartData,
      nwChartData,
      rwChartData
    } = this.state;

    return (
      <>
        <Card color="black" style={{ height: '270px', width: '31%' }}>
          <Card.Content>
            <span style={{ fontSize: '13px' }}>Max CPU Percent %</span>
          </Card.Content>
          <div style={{ padding: '10px', height: '100%', width: '100%' }}>
            <Loader active={cpuChartData === null} />
            <LineChart data={cpuChartData || []} fullWidth fullHeight />
          </div>
        </Card>
        <Card color="black" style={{ height: '270px', width: '31%' }}>
          <Card.Content>
            <span style={{ fontSize: '13px' }}>Max Connections</span>
          </Card.Content>
          <div style={{ padding: '10px', height: '100%', width: '100%' }}>
            <Loader active={connChartData === null} />
            <LineChart data={connChartData || []} fullWidth fullHeight />
          </div>
        </Card>

        <Card color="black" style={{ height: '270px', width: '47%' }}>
          <Card.Content>
            <span style={{ fontSize: '13px' }}>
              Network TX+RX Throughput Bytes/s
            </span>
          </Card.Content>
          <div style={{ padding: '10px', height: '100%', width: '100%' }}>
            <Loader active={nwChartData === null} />
            <LineChart data={nwChartData || []} fullWidth fullHeight />
          </div>
        </Card>

        <Card color="black" style={{ height: '270px', width: '47%' }}>
          <Card.Content>
            <span style={{ fontSize: '13px' }}>
              Read/Write Throughput Bytes/s
            </span>
          </Card.Content>
          <div style={{ padding: '10px', height: '100%', width: '100%' }}>
            <Loader active={rwChartData === null} />
            <LineChart data={rwChartData || []} fullWidth fullHeight />
          </div>
        </Card>
      </>
    );
  }
}
