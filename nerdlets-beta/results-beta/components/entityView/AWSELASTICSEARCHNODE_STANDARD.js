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
  Switch,
  EntityTitleTableRowCell
} from 'nr1';
import calculate from '../../context/calculate';

// eslint-disable-next-line no-unused-vars
export default function AwsElasticsearchNodeViewStandard(props) {
  const { entities, groupTitle, groupName } = props;
  const [hideUndetected, setUndetected] = useState(false);
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
    { key: 'Cluster', value: ({ item }) => item?.clusterName },
    { key: 'Region', value: ({ item }) => item?.tags?.['aws.awsRegion']?.[0] },
    {
      key: 'Instance Type',
      value: ({ item }) => item?.discoveredPrices?.[0]?.['Instance Type']
    },
    {
      key: 'Price Per Hour',
      value: ({ item }) => item?.discoveredPrices?.[0]?.price
    },
    {
      key: 'Cost (Price Per Hour * Hours)',
      value: ({ item }) => item?.periodCost
    }
  ];

  return (
    <>
      <Card collapsible style={{ marginLeft: '0px' }}>
        <CardHeader
          style={{ marginLeft: '0px', width: '80%' }}
          title={`${groupTitle || 'AWS ELASTICSEARCH NODE'} (${
            entities.length
          })`}
          additionalInfoLink={{
            label: `Pricing`,
            to: 'https://aws.amazon.com/opensearch-service/pricing/'
          }}
        />
        <CardBody
          style={{ marginLeft: '0px', marginRight: '0px', marginBottom: '0px' }}
        >
          <Switch
            checked={hideUndetected}
            onChange={() => setUndetected(!hideUndetected)}
            label="Hide nodes with undetected clusters"
          />

          <Table
            items={entities.filter(
              e => (hideUndetected && e?.clusterName) || !hideUndetected
            )}
            multivalue
          >
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
              const instance = item?.discoveredPrices?.[0];
              return (
                <TableRow actions={[]}>
                  <EntityTitleTableRowCell
                    value={item}
                    onClick={() => navigation.openStackedEntity(item.guid)}
                  />
                  <TableRowCell>{groupName || item?.clusterName}</TableRowCell>
                  <TableRowCell>
                    {item?.tags?.['aws.awsRegion']?.[0]}
                  </TableRowCell>
                  <TableRowCell
                    additionalValue={
                      instance
                        ? `CPU: ${instance.vCPU} Mem (GiB): ${instance['Memory (GiB)']}`
                        : ''
                    }
                  >
                    {instance?.['Instance Type']}
                  </TableRowCell>
                  <TableRowCell>{instance?.price}</TableRowCell>
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
