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
  EntityTitleTableRowCell,
  MetricTableRowCell
} from 'nr1';
import calculate from '../../context/calculate';
import { pickServiceColor } from '../../../shared/utils';
import CostBar from '../costBar';
import CostSummary from '../resultPanel/costSummary';

// eslint-disable-next-line no-unused-vars
export default function AwsAlbView(props) {
  const { entities, entityTableMode, updateDataState } = props;
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

  const cost = calculate({ workloadData: { results: entities } });
  const serviceTotal = (cost?.known || 0) + (cost?.estimated || 0);

  const firstHeaders = [
    { key: 'Name', value: ({ item }) => item.name },
    { key: 'Region', value: ({ item }) => item?.tags?.['aws.awsRegion']?.[0] }
  ];

  const additionalFields = [
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

  const lastHeaders = [
    {
      key: 'Cost (Hours * LCU Cost + Hours * Cost Per Hour)',
      value: ({ item }) => item.periodCost
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
          {`AWS ALB (${entities.length})`}
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

              const entityTotal = item?.periodCost || 0;
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
                        {
                          LoadBalancerSample?.[
                            'provider.activeConnectionCount.Sum'
                          ]
                        }
                      </TableRowCell>
                      <TableRowCell>
                        {
                          LoadBalancerSample?.[
                            'provider.newConnectionCount.Sum'
                          ]
                        }
                      </TableRowCell>

                      <MetricTableRowCell
                        type={MetricTableRowCell.TYPE.BYTES}
                        value={
                          LoadBalancerSample?.[
                            'provider.processedBytes.Maximum'
                          ] || 0
                        }
                      />

                      <TableRowCell>{item?.lcuCostPerHour}</TableRowCell>
                      <TableRowCell>{item?.pricePerHour}</TableRowCell>
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
