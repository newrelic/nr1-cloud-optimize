import React, { useState } from 'react';
import {
  navigation,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  MetricTableRowCell,
  Card,
  CardHeader,
  CardBody
} from 'nr1';

// eslint-disable-next-line no-unused-vars
export default function HostK8sContainerModal(props) {
  const { entity } = props;
  if (!entity) {
    return '';
  }
  const { K8sContainerData, SystemSample, exactPeriodCost } = entity;
  const [column, setColumn] = useState(0);
  const [sortingType, setSortingType] = useState(
    TableHeaderCell.SORTING_TYPE.NONE
  );

  const onClickTableHeaderCell = (nextColumn, { nextSortingType }) => {
    if (nextColumn === column) {
      setSortingType(nextSortingType);
    } else {
      setSortingType(nextSortingType);
      setColumn(nextColumn);
    }
  };

  const coreMultiplier = 16;
  const hostComputeUnits =
    SystemSample.coreCount * coreMultiplier +
    SystemSample.memoryTotalBytes / 1000 / 1000 / 1000;
  const costPerComputeUnit = (exactPeriodCost || 0) / hostComputeUnits;

  let totalContainerCost = 0;
  let totalContainerCostConfigured = 0;

  const containers = (K8sContainerData || [])
    .map(c => {
      const { maxCpuUsedCores } = c;
      const memoryUsedGb = c.maxMemoryUsedBytes / 1000 / 1000 / 1000;
      const memoryLimitGb = (c.memoryLimitBytes || 0) / 1000 / 1000 / 1000;

      // original calculation
      // const estimatedComputeUnits = maxCpuUsedCores * memoryUsedGb;

      // const estimatedComputeUnitsConfigured =
      //   c.cpuLimitCores || 0 * memoryLimitGb || 0;

      // const estimatedCost = estimatedComputeUnits * costPerComputeUnit;

      // const estimatedCostConfigured =
      //   estimatedComputeUnitsConfigured * costPerComputeUnit;

      // totalContainerCost += estimatedCost || 0;
      // totalContainerCostConfigured +=
      //   estimatedCostConfigured || estimatedCost || 0;

      // const messages = [
      //   `Host compute units ((CPU Cores * ${coreMultiplier}) x Memory (GB)): ${hostComputeUnits}`,
      //   `Host cost: ${totalCost}`,
      //   `Estimated cost per computer unit (host cost/compute units): ${costPerComputeUnit}`,
      //   `Container memory used GB: ${memoryUsedGb}`,
      //   `Container memory cores used: ${maxCpuUsedCores}`,
      //   `Container compute units ((CPU Cores * ${coreMultiplier}) x Memory (GB)): ${estimatedComputeUnits}`,
      //   `Estimated cost (container compute units x cost per compute unit ): ${estimatedCost}`
      // ];

      const estimatedComputeUnits =
        maxCpuUsedCores * coreMultiplier + memoryUsedGb;
      const cpuCost = maxCpuUsedCores * coreMultiplier * costPerComputeUnit;
      const memCost = memoryUsedGb * costPerComputeUnit;
      const estimatedCost = cpuCost + memCost;
      totalContainerCost += estimatedCost || 0;

      //
      const confCpuCost =
        (c.cpuLimitCores * coreMultiplier || 0) * costPerComputeUnit;
      const confMemCost = (memoryLimitGb || 0) * costPerComputeUnit;
      const estimatedCostConfigured = confCpuCost + confMemCost;

      totalContainerCostConfigured +=
        estimatedCostConfigured || estimatedCost || 0;

      return {
        ...c,
        memoryUsedGb,
        estimatedComputeUnits,
        estimatedCost,
        estimatedCostConfigured
      };
    })
    .filter(c => c.containerName.toLowerCase().includes(''.toLowerCase()))
    .sort((a, b) => b.estimatedCost - a.estimatedCost);

  return (
    <>
      <Card collapsible style={{ marginLeft: '0px', height: '95%' }}>
        <CardHeader
          style={{ marginLeft: '0px', width: '80%' }}
          title={`${entity.name} - Kubernetes Containers (${containers.length})`}
        />
        <CardBody
          style={{ marginLeft: '0px', marginRight: '0px', marginBottom: '0px' }}
        >
          <Table items={containers} rowCount={containers.length}>
            <TableHeader>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 0 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(0, data)}
                value={({ item }) => item.containerName}
              >
                Name
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 1 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(1, data)}
                value={({ item }) => item.cpuLimitCores}
                alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
              >
                CPU Limit Cores
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 2 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(2, data)}
                value={({ item }) => item.maxCpuUsedCores}
                alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
              >
                CPU Used Cores
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 3 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(3, data)}
                value={({ item }) => item.maxCpuCoresUtilization}
                alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
              >
                CPU Utilization
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 4 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(4, data)}
                value={({ item }) => item.memoryLimitBytes}
                alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
              >
                Memory Limit
              </TableHeaderCell>

              <TableHeaderCell
                sortable
                sortingType={
                  column === 5 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(5, data)}
                value={({ item }) => item.maxMemoryUsedBytes}
                alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
              >
                Memory Used
              </TableHeaderCell>

              <TableHeaderCell
                sortable
                sortingType={
                  column === 6 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(6, data)}
                value={({ item }) => item.maxMemoryUtilization}
                alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
              >
                Memory Utilization
              </TableHeaderCell>

              <TableHeaderCell
                sortable
                sortingType={
                  column === 7 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(7, data)}
                value={({ item }) => item.estimatedCost}
                alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
              >
                Estimated Cost (usage)
              </TableHeaderCell>

              <TableHeaderCell
                sortable
                sortingType={
                  column === 8 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(8, data)}
                value={({ item }) => item.estimatedCost}
                alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
              >
                Estimated Cost (limit)
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
                  // onClick={
                  //   item.messages.length > 0
                  //     ? () =>
                  //         this.setState({
                  //           costModalHidden: false,
                  //           costMessages: item.messages
                  //         })
                  //     : undefined
                  // }
                  type={MetricTableRowCell.TYPE.COUNT}
                  value={item.estimatedCost}
                />

                <MetricTableRowCell
                  // onClick={
                  //   item.messages.length > 0
                  //     ? () =>
                  //         this.setState({
                  //           costModalHidden: false,
                  //           costMessages: item.messages
                  //         })
                  //     : undefined
                  // }
                  type={MetricTableRowCell.TYPE.COUNT}
                  value={item.estimatedCostConfigured}
                />
              </TableRow>
            )}
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
