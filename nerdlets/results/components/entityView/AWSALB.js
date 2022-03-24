import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  MetricTableRowCell,
  EntityTitleTableRowCell,
  Card,
  CardHeader,
  CardBody
} from 'nr1';
import calculate from '../../context/calculate';

// eslint-disable-next-line no-unused-vars
export default function AwsAlbView(props) {
  const { entities } = props;
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

  const cost = calculate({ workloadData: { results: entities } });
  const headers = [
    { key: 'Name', value: ({ item }) => item.name },
    { key: 'Region', value: ({ item }) => item?.tags?.['aws.awsRegion']?.[0] },
    {
      key: 'Active Conn. Count Max',
      value: ({ item }) =>
        item?.LoadBalancerSample?.['provider.activeConnectionCount.Sum']
    },
    {
      key: 'New Conn. Count Max',
      value: ({ item }) =>
        item?.LoadBalancerSample?.['provider.newConnectionCount.Sum']
    },
    {
      key: 'Estimated Process Bytes',
      value: ({ item }) =>
        item?.LoadBalancerSample?.['provider.processedBytes.Maximum'] || 0
    },
    {
      key: 'LCU Cost Per Hour',
      value: ({ item }) => item.lcuCostPerHour
    },
    {
      key: 'Cost Per Hour',
      value: ({ item }) => item.costPerHour
    }
  ];

  return (
    <>
      <Card collapsible style={{ marginLeft: '0px' }}>
        <CardHeader
          style={{ marginLeft: '0px', width: '80%' }}
          title={`AWS ALB (${entities.length})`}
          additionalInfoLink={{
            label: `Pricing`,
            to: 'https://aws.amazon.com/elasticloadbalancing/pricing/'
          }}
        />
        <CardBody
          style={{ marginLeft: '0px', marginRight: '0px', marginBottom: '0px' }}
        >
          <Table items={entities}>
            <TableHeader>
              {headers.map((h, i) => (
                // eslint-disable-next-line react/jsx-key
                <TableHeaderCell
                  {...h}
                  sortable
                  sortingType={
                    column === i
                      ? sortingType
                      : TableHeaderCell.SORTING_TYPE.NONE
                  }
                  onClick={(event, data) => onClickTableHeaderCell(i, data)}
                >
                  {h.key}
                </TableHeaderCell>
              ))}
            </TableHeader>

            {({ item }) => {
              const LoadBalancerSample = item?.LoadBalancerSample;

              return (
                <TableRow actions={[]}>
                  <EntityTitleTableRowCell
                    value={item}
                    onClick={() =>
                      window.open(
                        ` https://one.newrelic.com/redirect/entity/${item.guid}`,
                        '_blank'
                      )
                    }
                  />
                  <TableRowCell>
                    {item?.tags?.['aws.awsRegion']?.[0]}
                  </TableRowCell>
                  <TableRowCell>
                    {LoadBalancerSample?.['provider.activeConnectionCount.Sum']}
                  </TableRowCell>
                  <TableRowCell>
                    {LoadBalancerSample?.['provider.newConnectionCount.Sum']}
                  </TableRowCell>

                  <MetricTableRowCell
                    type={MetricTableRowCell.TYPE.BYTES}
                    value={
                      LoadBalancerSample?.['provider.processedBytes.Maximum'] ||
                      0
                    }
                  />

                  <TableRowCell>{item?.lcuCostPerHour}</TableRowCell>
                  <TableRowCell>{item?.costPerHour}</TableRowCell>
                </TableRow>
              );
            }}
          </Table>

          <Table items={[{ 1: 1 }]}>
            <TableHeader>
              <TableHeaderCell />
              <TableHeaderCell />
              <TableHeaderCell />
              <TableHeaderCell />
              <TableHeaderCell />
              <TableHeaderCell />
              <TableHeaderCell />
            </TableHeader>
            {() => {
              return (
                <TableRow actions={[]}>
                  <TableRowCell />
                  <TableRowCell />
                  <TableRowCell />
                  <TableRowCell />
                  <TableRowCell />
                  <TableRowCell
                    alignmentType={TableRowCell.ALIGNMENT_TYPE.RIGHT}
                  >
                    Total
                  </TableRowCell>
                  <TableRowCell>{cost.estimated}</TableRowCell>
                </TableRow>
              );
            }}
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
