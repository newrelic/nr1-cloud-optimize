import React from 'react';
import {
  Button,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  MetricTableRowCell,
  NerdGraphQuery,
  TextField,
  Layout,
  LayoutItem,
  Stack,
  StackItem,
  HeadingText,
  Card,
  CardBody
} from 'nr1';
import { timeRangeToNrql } from '../shared/lib/queries';
import CostModal from './costModal';

const nrqlQuery = (accountId, query) => `{
  actor {
    account(id: ${accountId}) {
      nrql(query: "${query}", timeout: 60) {
        results
      }
    }
  }
}`;

const getK8sContainerData = (hostname, timeRange) =>
  `FROM K8sContainerSample SELECT latest(containerName) as 'containerName', latest(containerImage) as 'imageName', \
  latest(cpuLimitCores) as 'cpuLimitCores', max(cpuUsedCores) as 'maxCpuUsedCores', max(cpuCoresUtilization) as 'maxCpuCoresUtilization', \
  latest(memoryLimitBytes) as 'memoryLimitBytes', max(memoryUsedBytes) as 'maxMemoryUsedBytes', max(memoryUtilization) as 'maxMemoryUtilization' \
  WHERE hostname = '${hostname}' FACET containerID, entityGuid LIMIT MAX ${timeRangeToNrql(
    timeRange
  )}`;

export default class K8sContainerOptimize extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      column: 0,
      sortDirection: TableHeaderCell.SORTING_TYPE.NONE,
      containerData: null,
      fetchingData: true,
      searchText: '',
      costModalHidden: true,
      costMessages: []
    };
  }

  async componentDidMount() {
    const { hostname, timeRange, account } = this.props;
    const getK8sContainerDataQuery = getK8sContainerData(hostname, timeRange);

    const ngData = await NerdGraphQuery.query({
      query: nrqlQuery(account.id, getK8sContainerDataQuery)
    });

    const containerData = ngData?.data?.actor?.account?.nrql?.results || null;

    this.setState({ fetchingData: false, containerData });
  }

  onClickTableHeaderCell = (column, { nextSortingType }) => {
    if (column === this.state.column) {
      this.setState({ sortDirection: nextSortingType });
    } else {
      this.setState({ column, sortDirection: nextSortingType });
    }
  };

  render() {
    const { costModalHidden, costMessages } = this.state;
    const { hostname, systemMemoryBytes, coreCount, cost } = this.props;
    const { totalCost } = cost;
    const hostComputeUnits =
      coreCount * (systemMemoryBytes / 1000 / 1000 / 1000);
    const costPerComputeUnit = totalCost / hostComputeUnits;

    const {
      containerData,
      column,
      sortDirection,
      searchText,
      fetchingData
    } = this.state;

    const containers = (containerData || [])
      .map(c => {
        const { maxCpuUsedCores } = c;
        const memoryUsedGb = c.maxMemoryUsedBytes / 1000 / 1000 / 1000;
        const estimatedComputeUnits = maxCpuUsedCores * memoryUsedGb;
        const estimatedCost = estimatedComputeUnits * costPerComputeUnit;
        const messages = [
          `Host compute units (CPU Cores x Memory (GB)): ${hostComputeUnits}`,
          `Host cost: ${totalCost}`,
          `Estimated cost per computer unit (host cost/compute units): ${costPerComputeUnit}`,
          `Container memory used GB: ${memoryUsedGb}`,
          `Container memory cores used: ${maxCpuUsedCores}`,
          `Container compute units (CPU Cores x Memory (GB)): ${estimatedComputeUnits}`,
          `Estimated cost (container compute units x cost per compute unit ): ${estimatedCost}`
        ];

        return {
          ...c,
          memoryUsedGb,
          estimatedComputeUnits,
          estimatedCost,
          messages
        };
      })
      .filter(c =>
        c.containerName.toLowerCase().includes(searchText.toLowerCase())
      )
      .sort((a, b) => b.cpuLimitCores - a.cpuLimitCores);

    return (
      <div style={{ paddingLeft: '10px' }}>
        <CostModal
          hidden={costModalHidden}
          messages={costMessages}
          onClose={() => this.setState({ costModalHidden: true })}
        />

        <Layout fullHeight>
          <LayoutItem>
            <Stack directionType={Stack.DIRECTION_TYPE.VERTICAL} fullWidth>
              <StackItem grow style={{ width: '100%' }}>
                <HeadingText
                  style={{
                    paddingLeft: '10px',
                    paddingTop: '10px'
                  }}
                  type={HeadingText.TYPE.HEADING_3}
                >
                  {hostname}&nbsp;-&nbsp;Containers
                </HeadingText>

                <Card>
                  <CardBody>
                    <TextField
                      type={TextField.TYPE.SEARCH}
                      placeholder={
                        containers.length > 0
                          ? 'Search container name...'
                          : 'No containers found...'
                      }
                      style={{ paddingLeft: '10px', width: '100%' }}
                      value={searchText}
                      onChange={e =>
                        this.setState({ searchText: e.target.value })
                      }
                      loading={fetchingData}
                    />
                    {containers.length > 0 && (
                      <Table
                        ariaLabel=""
                        items={containers}
                        rowCount={containers.length}
                      >
                        <TableHeader>
                          <TableHeaderCell
                            sortable
                            sortingType={
                              column === 0
                                ? sortDirection
                                : TableHeaderCell.SORTING_TYPE.NONE
                            }
                            onClick={(event, data) =>
                              this.onClickTableHeaderCell(0, data)
                            }
                            value={({ item }) => item.containerName}
                          >
                            Name
                          </TableHeaderCell>
                          <TableHeaderCell
                            sortable
                            sortingType={
                              column === 1
                                ? sortDirection
                                : TableHeaderCell.SORTING_TYPE.NONE
                            }
                            onClick={(event, data) =>
                              this.onClickTableHeaderCell(1, data)
                            }
                            value={({ item }) => item.cpuLimitCores}
                            alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
                          >
                            CPU Limit Cores
                          </TableHeaderCell>
                          <TableHeaderCell
                            sortable
                            sortingType={
                              column === 2
                                ? sortDirection
                                : TableHeaderCell.SORTING_TYPE.NONE
                            }
                            onClick={(event, data) =>
                              this.onClickTableHeaderCell(2, data)
                            }
                            value={({ item }) => item.maxCpuUsedCores}
                            alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
                          >
                            CPU Used Cores
                          </TableHeaderCell>
                          <TableHeaderCell
                            sortable
                            sortingType={
                              column === 3
                                ? sortDirection
                                : TableHeaderCell.SORTING_TYPE.NONE
                            }
                            onClick={(event, data) =>
                              this.onClickTableHeaderCell(3, data)
                            }
                            value={({ item }) => item.maxCpuCoresUtilization}
                            alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
                          >
                            CPU Utilization
                          </TableHeaderCell>
                          <TableHeaderCell
                            sortable
                            sortingType={
                              column === 4
                                ? sortDirection
                                : TableHeaderCell.SORTING_TYPE.NONE
                            }
                            onClick={(event, data) =>
                              this.onClickTableHeaderCell(4, data)
                            }
                            value={({ item }) => item.memoryLimitBytes}
                            alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
                          >
                            Memory Limit
                          </TableHeaderCell>

                          <TableHeaderCell
                            sortable
                            sortingType={
                              column === 5
                                ? sortDirection
                                : TableHeaderCell.SORTING_TYPE.NONE
                            }
                            onClick={(event, data) =>
                              this.onClickTableHeaderCell(5, data)
                            }
                            value={({ item }) => item.maxMemoryUsedBytes}
                            alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
                          >
                            Memory Used
                          </TableHeaderCell>

                          <TableHeaderCell
                            sortable
                            sortingType={
                              column === 6
                                ? sortDirection
                                : TableHeaderCell.SORTING_TYPE.NONE
                            }
                            onClick={(event, data) =>
                              this.onClickTableHeaderCell(6, data)
                            }
                            value={({ item }) => item.maxMemoryUtilization}
                            alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
                          >
                            Memory Utilization
                          </TableHeaderCell>

                          <TableHeaderCell
                            sortable
                            sortingType={
                              column === 7
                                ? sortDirection
                                : TableHeaderCell.SORTING_TYPE.NONE
                            }
                            onClick={(event, data) =>
                              this.onClickTableHeaderCell(7, data)
                            }
                            value={({ item }) => item.estimatedCost}
                            alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
                          >
                            Estimated Cost
                          </TableHeaderCell>
                        </TableHeader>
                        {({ item }) => (
                          <TableRow>
                            <TableRowCell>{item.containerName}</TableRowCell>

                            <MetricTableRowCell
                              type={MetricTableRowCell.TYPE.COUNT}
                              value={item.cpuLimitCores}
                            />

                            <MetricTableRowCell
                              type={MetricTableRowCell.TYPE.COUNT}
                              value={item.maxCpuUsedCores}
                            />

                            <MetricTableRowCell
                              type={MetricTableRowCell.TYPE.PERCENTAGE}
                              value={item.maxCpuCoresUtilization / 100}
                            />

                            <MetricTableRowCell
                              type={MetricTableRowCell.TYPE.BYTES}
                              value={item.memoryLimitBytes}
                            />

                            <MetricTableRowCell
                              type={MetricTableRowCell.TYPE.BYTES}
                              value={item.maxMemoryUsedBytes}
                            />

                            <MetricTableRowCell
                              type={MetricTableRowCell.TYPE.PERCENTAGE}
                              value={item.maxMemoryUtilization / 100}
                            />

                            <MetricTableRowCell
                              onClick={
                                item.messages.length > 0
                                  ? () =>
                                      this.setState({
                                        costModalHidden: false,
                                        costMessages: item.messages
                                      })
                                  : undefined
                              }
                              type={MetricTableRowCell.TYPE.COUNT}
                              value={item.estimatedCost}
                            />
                          </TableRow>
                        )}
                      </Table>
                    )}
                  </CardBody>
                </Card>
              </StackItem>
            </Stack>
          </LayoutItem>
        </Layout>
      </div>
    );
  }
}
