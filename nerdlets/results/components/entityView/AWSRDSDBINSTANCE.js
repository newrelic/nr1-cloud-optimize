import React, { useState } from 'react';
import {
  navigation,
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
export default function AwsRdsDbInstanceView(props) {
  const { entities, timeData } = props;
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

  const cost = calculate({ workloadData: { results: entities, timeData } });

  const headers = [
    { key: 'Name', value: ({ item }) => item.name },
    { key: 'Region', value: ({ item }) => item?.tags?.['aws.awsRegion']?.[0] },
    {
      key: 'Max CPU %',
      value: ({ item }) =>
        item?.DatastoreSample?.['max.provider.cpuUtilization.Maximum']
    },
    {
      key: 'Max Memory %',
      value: ({ item }) => item?.DatastoreSample?.memoryUsage
    },
    {
      key: 'Max Storage %',
      value: ({ item }) => item?.DatastoreSample?.storageUsage
    },
    {
      key: 'Max DB Connections',
      value: ({ item }) =>
        item?.DatastoreSample?.['max.provider.databaseConnections.Maximum']
    },
    {
      key: 'Instance Type',
      value: ({ item }) => item?.tags?.['aws.dbInstanceClass']?.[0]
    },
    {
      key: 'Price Per Hour',
      value: ({ item }) => item?.price?.onDemandPrice?.pricePerUnit?.USD
    },
    {
      key: 'Cost (Price * Hours)',
      value: ({ item }) => item?.periodCost
    }
  ];

  return (
    <>
      <Card collapsible style={{ marginLeft: '0px' }}>
        <CardHeader
          style={{ marginLeft: '0px', width: '80%' }}
          title={`AWS RDS (${entities.length})`}
          additionalInfoLink={{
            label: `Pricing`,
            to: 'https://aws.amazon.com/rds/pricing/'
          }}
        />
        <CardBody
          style={{ marginLeft: '0px', marginRight: '0px', marginBottom: '0px' }}
        >
          <Table items={entities} multivalue>
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
              const attributes = item?.price?.attributes;
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
                    {
                      item?.DatastoreSample?.[
                        'max.provider.cpuUtilization.Maximum'
                      ]
                    }
                  </TableRowCell>
                  <TableRowCell>
                    {item?.DatastoreSample?.memoryUsage}
                  </TableRowCell>
                  <TableRowCell>
                    {item?.DatastoreSample?.storageUsage}
                  </TableRowCell>
                  <TableRowCell>
                    {
                      item?.DatastoreSample?.[
                        'max.provider.databaseConnections.Maximum'
                      ]
                    }
                  </TableRowCell>
                  <TableRowCell
                    additionalValue={`CPU: ${attributes.vcpu} Mem (GiB): ${attributes.memory}`}
                  >
                    {item?.tags?.['aws.dbInstanceClass']?.[0]}
                  </TableRowCell>
                  <TableRowCell>
                    {item?.price?.onDemandPrice?.pricePerUnit?.USD}
                  </TableRowCell>
                  <TableRowCell>{item?.periodCost}</TableRowCell>
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
                  <TableRowCell />
                  <TableRowCell
                    alignmentType={TableRowCell.ALIGNMENT_TYPE.RIGHT}
                  >
                    Total
                  </TableRowCell>
                  <TableRowCell>{cost.known}</TableRowCell>
                </TableRow>
              );
            }}
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
