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
  Switch,
  EntityTitleTableRowCell
} from 'nr1';
import calculate from '../../context/calculate';

// eslint-disable-next-line no-unused-vars
export default function AwsSqsView(props) {
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
    { key: 'Region', value: ({ item }) => item?.tags?.['aws.awsRegion']?.[0] },
    {
      key: 'Message Total',
      value: ({ item }) => item?.QueueSample?.numberOfMessages
    },
    {
      key: 'Message Cost',
      value: ({ item }) => item.messageCostStandardPerReq
    }
  ];

  return (
    <>
      <Card collapsible style={{ marginLeft: '0px' }}>
        <CardHeader
          style={{ marginLeft: '0px', width: '80%' }}
          title={`AWS SQS QUEUE (${entities.length})`}
          additionalInfoLink={{
            label: `Pricing`,
            to: 'https://aws.amazon.com/sqs/pricing/'
          }}
        />
        <CardBody
          style={{ marginLeft: '0px', marginRight: '0px', marginBottom: '0px' }}
        >
          <Switch
            checked={hideUndetected}
            onChange={() => setUndetected(!hideUndetected)}
            label="Hide queues with no messages"
          />

          <Table
            items={entities.filter(
              e =>
                (hideUndetected && e?.QueueSample?.numberOfMessages) ||
                !hideUndetected
            )}
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
              const QueueSample = item?.QueueSample;

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
                  <TableRowCell>{QueueSample?.numberOfMessages}</TableRowCell>

                  <TableRowCell>
                    {item?.messageCostStandardPerReq
                      ? (item?.messageCostStandardPerReq).toFixed(10)
                      : ''}
                  </TableRowCell>
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
