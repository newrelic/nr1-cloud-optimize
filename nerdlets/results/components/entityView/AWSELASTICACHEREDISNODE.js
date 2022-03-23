import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  HeadingText,
  Switch,
  EntityTitleTableRowCell
} from 'nr1';
import calculate from '../../context/calculate';

// eslint-disable-next-line no-unused-vars
export default function AwsElasticacheRedisNodeView(props) {
  const { entities } = props;
  const [hideUndetected, setUndetected] = useState(true);
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
    { key: 'Cluster', value: ({ item }) => item?.cacheClusterId },
    { key: 'Region', value: ({ item }) => item?.tags?.['aws.awsRegion']?.[0] },
    {
      key: 'Instance Type',
      value: ({ item }) => item?.discoveredPrices?.[0]?.['Instance Type']
    },
    {
      key: 'Cost Per Hour',
      value: ({ item }) => item?.discoveredPrices?.[0]?.price
    }
  ];

  return (
    <>
      <HeadingText
        type={HeadingText.TYPE.HEADING_5}
        style={{ paddingBottom: '0px', marginBottom: '0px' }}
      >
        AWS ELASTICACHE REDIS NODE
      </HeadingText>

      <Switch
        checked={hideUndetected}
        onChange={() => setUndetected(!hideUndetected)}
        label="Hide nodes with undetected clusters"
      />

      <Table
        items={entities.filter(
          e => (hideUndetected && e?.cacheClusterId) || !hideUndetected
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
                column === i ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
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
                onClick={() =>
                  window.open(
                    ` https://one.newrelic.com/redirect/entity/${item.guid}`,
                    '_blank'
                  )
                }
              />
              <TableRowCell>{item?.cacheClusterId}</TableRowCell>
              <TableRowCell>{item?.tags?.['aws.awsRegion']?.[0]}</TableRowCell>
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
              <TableRowCell alignmentType={TableRowCell.ALIGNMENT_TYPE.RIGHT}>
                Total
              </TableRowCell>
              <TableRowCell>{cost.known}</TableRowCell>
            </TableRow>
          );
        }}
      </Table>
    </>
  );
}
