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
  MetricTableRowCell,
  EntityTitleTableRowCell
} from 'nr1';
import calculate from '../../context/calculate';
import CostSummary from '../resultPanel/costSummary';
import CardView from '../cardView';
import { renderProviderIcon } from '../../../shared/utils';
import CostBar from '../costBar';

// eslint-disable-next-line no-unused-vars
export default function AwsElbView(props) {
  const { entities, cardListView } = props;
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
      {cardListView === 'card' ? (
        <>
          <CardView
            cost={cost}
            entities={entities}
            entityType="AWS ELB"
            pricingUrl="https://aws.amazon.com/elasticloadbalancing/pricing/"
            provider="AWS"
          />
        </>
      ) : (
        <div>
          <br />
          <Card collapsible defaultCollapsed style={{ marginLeft: '0px' }}>
            <CardHeader
              style={{ marginTop: '0px', width: '80%', marginBottom: '0px' }}
              // additionalInfoLink={{
              //   label: `Pricing`,
              //   to: 'https://aws.amazon.com/elasticloadbalancing/pricing/'
              // }}
            >
              <div style={{ float: 'left' }}>
                <div style={{ float: 'left' }}>{renderProviderIcon('AWS')}</div>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    paddingLeft: '5px'
                  }}
                >
                  AWS ELB
                </span>
                <br />
                <span style={{ paddingLeft: '5px' }}>
                  {entities?.length === 1
                    ? '1 entity'
                    : `${entities.length} entities`}
                  &nbsp;{' '}
                  {/* {pricingUrl && (
                <span style={{ cursor: 'pointer', color: '#0B6ACB' }}>
                  Pricing{' '}
                  <Icon
                    style={{ marginBottom: '7px' }}
                    type={Icon.TYPE.INTERFACE__OPERATIONS__EXTERNAL_LINK}
                  />
                </span>
              )} */}
                </span>
                <br />
              </div>
              <br /> <br /> <br />
              <CostSummary cost={cost} disablePotential disableKnown />
            </CardHeader>
            <CardBody
              style={{
                marginTop: '0px',
                paddingLeft: '30px',
                marginBottom: '0px'
              }}
            >
              <Table items={entities} style={{}}>
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
                        onClick={() => navigation.openStackedEntity(item.guid)}
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
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
