import React, { useState } from 'react';
import {
  navigation,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  EntityTitleTableRowCell,
  Card,
  CardHeader,
  CardBody
} from 'nr1';
import calculate from '../../context/calculate';

// eslint-disable-next-line no-unused-vars
export default function AwsAPIGatewayView(props) {
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
    { key: 'Requests', value: ({ item }) => item?.ApiGatewaySample?.requests },
    { key: 'API Call Price', value: ({ item }) => item.apiCallPrice },
    {
      key: 'Cost (Requests * Call Price)',
      value: ({ item }) => item.requestCost
    }
  ];

  return (
    <>
      <Card collapsible style={{ marginLeft: '0px' }}>
        <CardHeader
          style={{ marginLeft: '0px', width: '80%' }}
          title={`AWS API GATEWAY (${entities.length})`}
          additionalInfoLink={{
            label: `Pricing`,
            to: 'https://aws.amazon.com/api-gateway/pricing/'
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
              return (
                <TableRow actions={[]}>
                  <EntityTitleTableRowCell
                    value={item}
                    onClick={() => navigation.openStackedEntity(item.guid)}
                  />
                  <TableRowCell>
                    {item?.tags?.['aws.awsRegion']?.[0]}
                  </TableRowCell>
                  <TableRowCell>
                    {item?.ApiGatewaySample?.requests}
                  </TableRowCell>
                  <TableRowCell>{item.apiCallPrice}</TableRowCell>
                  <TableRowCell>{item.requestCost}</TableRowCell>
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
            </TableHeader>
            {() => {
              return (
                <TableRow actions={[]}>
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
