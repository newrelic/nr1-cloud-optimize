import React from 'react';
import { NrqlQuery, LineChart } from 'nr1';
import { Card, Loader } from 'semantic-ui-react';
import _ from 'lodash';

const systemSampleCpu = `FROM SystemSample SELECT max(cpuPercent) TIMESERIES FACET entityName`;
const systemSampleMem = `FROM SystemSample SELECT max(memoryUsedBytes/memoryTotalBytes)*100 as 'max.memoryPercent' TIMESERIES FACET entityName`;
const networkSample = `FROM NetworkSample SELECT max(receiveBytesPerSecond+transmitBytesPerSecond) as 'networkBytesPerSecond' TIMESERIES FACET entityName`;

const vSphereVmCpu = `FROM VSphereVmSample SELECT max(cpu.hostUsagePercent) as 'max.cpuPercent' TIMESERIES FACET entityName`;
const vSphereVmMem = `FROM VSphereVmSample SELECT max(mem.usage/mem.size) *100 as 'max.memoryPercent' TIMESERIES FACET entityName`;

const vSphereHostCpu = `FROM VSphereHostSample SELECT max(cpu.percent) as 'max.cpuPercent' TIMESERIES FACET entityName`;
const vSphereHostMem = `FROM VSphereHostSample SELECT max(mem.usage/mem.size) *100 as 'max.memoryPercent' TIMESERIES FACET entityName`;

export default class InstancePerformanceCard extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      cpuChartData: null,
      memChartData: null,
      nwChartData: null
    };
  }

  async componentDidMount() {
    const { entities } = this.props;
    const accountGroups = _.groupBy(entities, d => d.account.id);
    Object.keys(accountGroups).forEach(id => {
      accountGroups[id] = _.groupBy(accountGroups[id], d => d.type);
    });

    const cpuQueryPromises = [];
    const memQueryPromises = [];
    const nwQueryPromises = [];

    Object.keys(accountGroups).forEach(id => {
      Object.keys(accountGroups[id]).forEach(type => {
        let cpuQuery = systemSampleCpu;
        let memQuery = systemSampleMem;
        switch (type) {
          case 'HOST':
            cpuQuery = systemSampleCpu;
            memQuery = systemSampleMem;
            break;
          case 'VSPHEREVM':
            cpuQuery = vSphereVmCpu;
            memQuery = vSphereVmMem;
            break;
          case 'VSPHEREHOST':
            cpuQuery = vSphereHostCpu;
            memQuery = vSphereHostMem;
            break;
        }

        const guids = `'${accountGroups[id][type]
          .map(e => e.guid)
          .join("','")}'`;
        cpuQuery += ` WHERE entityGuid IN (${guids})`;
        memQuery += ` WHERE entityGuid IN (${guids})`;
        cpuQueryPromises.push(
          NrqlQuery.query({ accountId: id, query: cpuQuery })
        );
        memQueryPromises.push(
          NrqlQuery.query({ accountId: id, query: memQuery })
        );
        if (type === 'HOST') {
          const networkQuery = `${networkSample} WHERE entityGuid IN (${guids})`;
          nwQueryPromises.push(
            NrqlQuery.query({ accountId: id, query: networkQuery })
          );
        }
      });
    });

    let cpuChartData = [];
    let memChartData = [];
    let nwChartData = [];

    const allDataPromises = [
      Promise.all(cpuQueryPromises),
      Promise.all(memQueryPromises),
      Promise.all(nwQueryPromises)
    ];

    await Promise.all(allDataPromises).then(d => {
      d.forEach((arr, i) => {
        if (i === 0) {
          arr.forEach(v => {
            if (v.data) {
              cpuChartData = [...cpuChartData, ...v.data.chart];
            }
          });
        } else if (i === 1) {
          arr.forEach(v => {
            if (v.data) {
              memChartData = [...memChartData, ...v.data.chart];
            }
          });
        } else if (i === 2) {
          arr.forEach(v => {
            if (v.data) {
              nwChartData = [...nwChartData, ...v.data.chart];
            }
          });
        }
      });
    });

    this.setState({ cpuChartData, memChartData, nwChartData });
  }

  render() {
    const { cpuChartData, memChartData, nwChartData } = this.state;
    return (
      <>
        <Card color="black" style={{ height: '270px', width: '31%' }}>
          <Card.Content>
            <span style={{ fontSize: '13px' }}>Max CPU Percent</span>
          </Card.Content>
          <div style={{ padding: '10px', height: '100%', width: '100%' }}>
            <Loader active={cpuChartData === null} />
            <LineChart data={cpuChartData || []} fullWidth fullHeight />
          </div>
        </Card>
        <Card color="black" style={{ height: '270px', width: '31%' }}>
          <Card.Content>
            <span style={{ fontSize: '13px' }}>Max Memory Percent</span>
          </Card.Content>
          <div style={{ padding: '10px', height: '100%', width: '100%' }}>
            <Loader active={memChartData === null} />
            <LineChart data={memChartData || []} fullWidth fullHeight />
          </div>
        </Card>
        <Card color="black" style={{ height: '270px', width: '31%' }}>
          <Card.Content>
            <span style={{ fontSize: '13px' }}>
              Max Transmit + Receive Bytes Per Second
            </span>
          </Card.Content>
          <div style={{ padding: '10px', height: '100%', width: '100%' }}>
            <Loader active={nwChartData === null} />
            <LineChart data={nwChartData || []} fullWidth fullHeight />
          </div>
        </Card>
      </>
    );
  }
}
