import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  Card,
  CardHeader,
  CardBody,
  MetricTableRowCell,
  EntityTitleTableRowCell
} from 'nr1';
import calculate from '../../context/calculate';

// eslint-disable-next-line no-unused-vars
export default function AwsElbView(props) {
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
        item?.LoadBalancerSample?.[
          'provider.estimatedAlbActiveConnectionCount.Maximum'
        ]
    },
    {
      key: 'New Conn. Count Max',
      value: ({ item }) =>
        item?.LoadBalancerSample?.[
          'provider.estimatedAlbNewConnectionCount.Maximum'
        ]
    },
    {
      key: 'Estimated Process Bytes',
      value: ({ item }) =>
        item?.LoadBalancerSample?.['provider.estimatedProcessedBytes.Maximum']
    },
    { key: 'Price Per GB', value: ({ item }) => item.pricePerGB },
    {
      key: 'Price Per Hour',
      value: ({ item }) => item.pricePerHour
    },
    {
      key: 'Cost (Hours * Price Per Hour + Processed GB * Price Per GB)',
      value: ({ item }) => item.periodCost
    }
  ];

  return (
    <>
      <Card collapsible style={{ marginLeft: '0px' }}>
        <CardHeader
          style={{ marginLeft: '0px', width: '80%' }}
          title={`AWS ELB (${entities.length})`}
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
                    {
                      LoadBalancerSample?.[
                        'provider.estimatedAlbActiveConnectionCount.Maximum'
                      ]
                    }
                  </TableRowCell>
                  <TableRowCell>
                    {
                      LoadBalancerSample?.[
                        'provider.estimatedAlbNewConnectionCount.Maximum'
                      ]
                    }
                  </TableRowCell>

                  <MetricTableRowCell
                    type={MetricTableRowCell.TYPE.BYTES}
                    value={
                      LoadBalancerSample?.[
                        'provider.estimatedProcessedBytes.Maximum'
                      ]
                    }
                  />

                  <TableRowCell>{item?.pricePerGB}</TableRowCell>
                  <TableRowCell>{item.pricePerHour}</TableRowCell>
                  <TableRowCell>{item.periodCost}</TableRowCell>
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
