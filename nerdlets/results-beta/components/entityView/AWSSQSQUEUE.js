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
import { pickServiceColor } from '../../../shared/utils';
import CostBar from '../costBar';
import CostSummary from '../resultPanel/costSummary';

// eslint-disable-next-line no-unused-vars
export default function AwsSqsView(props) {
  const { entities, timeData, entityTableMode, updateDataState } = props;
  const [hideUndetected, setUndetected] = useState(true);
  const [column, setColumn] = useState(entityTableMode === 'minimal' ? 2 : 0);
  const [sortingType, setSortingType] = useState(
    TableHeaderCell.SORTING_TYPE.DESCENDING
  );
  const [collapsed, setCollapsed] = useState(true);

  const onClickTableHeaderCell = (nextColumn, { nextSortingType }) => {
    if (nextColumn === column) {
      setSortingType(nextSortingType);
    } else {
      setSortingType(nextSortingType);
      setColumn(nextColumn);
    }
  };

  const cost = calculate({ workloadData: { results: entities, timeData } });
  const serviceTotal = (cost?.known || 0) + (cost?.estimated || 0);

  const firstHeaders = [
    { key: 'Name', value: ({ item }) => item.name },
    { key: 'Region', value: ({ item }) => item?.tags?.['aws.awsRegion']?.[0] }
  ];

  const additionalFields = [
    {
      key: 'Message Total',
      value: ({ item }) => item?.QueueSample?.numberOfMessages
    },
    {
      key: 'Message Price',
      value: ({ item }) => item.messageCostStandardPerReq
    }
  ];

  const lastHeaders = [
    {
      key: 'Message Cost (Price * Messages)',
      value: ({ item }) =>
        item.messageCostStandardPerReq *
        (item?.QueueSample?.numberOfMessages || 0)
    }
  ];

  const headers =
    entityTableMode === 'full'
      ? [...firstHeaders, ...additionalFields, ...lastHeaders]
      : [...firstHeaders, ...lastHeaders];

  return (
    <>
      <Card
        collapsible
        defaultCollapsed
        style={{ marginLeft: '0px' }}
        onChange={(e, collapsed) => setCollapsed(collapsed)}
      >
        <CardHeader
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            marginLeft: '0px'
          }}
        >
          {`AWS SQS QUEUE (${entities.length})`}
          <br />
          <br />
          <div>
            <div style={{ float: 'left' }}>
              <CostSummary cost={cost} />
            </div>
            {!collapsed && <CostBar type="service" />}
          </div>
        </CardHeader>
        <CardBody
          style={{
            marginTop: '0px',
            paddingLeft: '30px',
            marginBottom: '0px'
          }}
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

              const entityOnClick =
                entityTableMode === 'full'
                  ? () => navigation.openStackedEntity(item.guid)
                  : () =>
                      updateDataState({
                        entitySideBarOpen: {
                          ...item,
                          firstHeaders,
                          additionalFields,
                          lastHeaders
                        }
                      });

              const entityTotal =
                (item?.requestCost || 0) +
                (item?.durationCost || 0) +
                (item?.periodCost || 0) +
                item.messageCostStandardPerReq *
                  (item?.QueueSample?.numberOfMessages || 0);

              const costPercentage = (entityTotal / serviceTotal) * 100;
              const { costColor } = pickServiceColor(
                isNaN(costPercentage) ? 0 : costPercentage
              );

              return (
                <TableRow actions={[]}>
                  <EntityTitleTableRowCell
                    value={item}
                    onClick={entityOnClick}
                    style={{ borderLeft: `5px solid ${costColor}` }}
                  />
                  <TableRowCell>
                    {item?.tags?.['aws.awsRegion']?.[0]}
                  </TableRowCell>

                  {entityTableMode === 'full' && (
                    <>
                      <TableRowCell>
                        {QueueSample?.numberOfMessages}
                      </TableRowCell>

                      <TableRowCell>
                        {item?.messageCostStandardPerReq
                          ? (item?.messageCostStandardPerReq).toFixed(10)
                          : ''}
                      </TableRowCell>
                    </>
                  )}

                  <TableRowCell>{entityTotal}</TableRowCell>
                </TableRow>
              );
            }}
          </Table>

          <br />

          <div style={{ width: '100%', borderTop: '1px #F1F1F1 solid' }}>
            <span
              style={{
                paddingTop: '5px',
                paddingBottom: '5px',
                paddingRight: '10px',
                float: 'right'
              }}
            >
              Total ${serviceTotal}
            </span>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
