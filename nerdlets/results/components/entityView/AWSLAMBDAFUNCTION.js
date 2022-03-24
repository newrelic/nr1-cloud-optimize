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
  EntityTitleTableRowCell
} from 'nr1';
import calculate from '../../context/calculate';

// eslint-disable-next-line no-unused-vars
export default function AwsLambdaFunctionView(props) {
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
      key: 'Invocations',
      value: ({ item }) => item?.LambdaSample?.['sum.provider.invocations.Sum']
    },
    {
      key: 'Average Duration (ms)',
      value: ({ item }) =>
        item?.LambdaSample?.['average.provider.duration.Maximum']
    },
    { key: 'Duration Price', value: ({ item }) => item.durationPrice },
    { key: 'Request Price', value: ({ item }) => item.requestPrice },
    { key: 'Duration Cost', value: ({ item }) => item.durationCost },
    { key: 'Request Cost', value: ({ item }) => item.requestCost }
  ];

  return (
    <>
      <Card collapsible style={{ marginLeft: '0px' }}>
        <CardHeader
          style={{ marginLeft: '0px', width: '80%' }}
          title={`AWS LAMBDA FUNCTION (${entities.length})`}
          additionalInfoLink={{
            label: `Pricing`,
            to: 'https://aws.amazon.com/lambda/pricing/'
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
              const LambdaSample = item?.LambdaSample;

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
                    {LambdaSample?.['sum.provider.invocations.Sum']}
                  </TableRowCell>
                  <TableRowCell>
                    {LambdaSample?.['average.provider.duration.Maximum']}
                  </TableRowCell>
                  <TableRowCell>{item?.durationPrice}</TableRowCell>
                  <TableRowCell>{item?.requestPrice}</TableRowCell>
                  <TableRowCell>{item?.durationCost}</TableRowCell>
                  <TableRowCell>{item?.requestCost}</TableRowCell>
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
            </TableHeader>
            {() => {
              return (
                <TableRow actions={[]}>
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
