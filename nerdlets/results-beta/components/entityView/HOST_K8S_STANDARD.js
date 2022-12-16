import React, { useState } from 'react';
import {
  navigation,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  MetricTableRowCell,
  EntityTitleTableRowCell,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Icon,
  Button
} from 'nr1';
import calculate from '../../context/calculate';
import CostSummary from '../resultPanel/costSummary';
import CostBar from '../costBar';
import { pickServiceColor } from '../../../shared/utils';
import Modal from 'react-modal';
import HostK8sContainerModal from './HOSTK8SCONTAINERMODAL';

// eslint-disable-next-line no-unused-vars
export default function HostKubernetesViewStandard(props) {
  const {
    entities,
    groupTitle,
    // groupName,
    obfuscate,
    entityTableMode,
    updateDataState
  } = props;
  const [column, setColumn] = useState(entityTableMode === 'minimal' ? 4 : 0);
  const [modalData, setModal] = useState(false);
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
    { key: 'Region', value: ({ item }) => item?.tags?.['aws.awsRegion']?.[0] },
    {
      key: 'Recommendations',
      value: ({ item }) => item.matches?.optimized?.[0]?.type
    },
    {
      key: 'Containers',
      value: ({ item }) => item.EcsContainerData.length
    }
  ];

  const additionalFields = [
    {
      key: 'Cloud',
      value: ({ item }) => item?.cloud
    },
    {
      key: 'Max CPU %',
      value: ({ item }) => item?.SystemSample?.['max.cpuPercent']
    },
    {
      key: 'Max Mem %',
      value: ({ item }) => item?.SystemSample?.['max.memoryPercent']
    },
    { key: 'Type', value: ({ item }) => item.matches?.exact?.[0]?.type },
    {
      key: 'Price Per Hour',
      value: ({ item }) => item.matches?.exact?.[0]?.onDemandPrice
    },
    {
      key: 'Optimized Type',
      value: ({ item }) => item.matches?.optimized?.[0]?.type
    },
    {
      key: 'Optimized Price Per Hour',
      value: ({ item }) => item.matches?.optimized?.[0]?.onDemandPrice
    },
    {
      key: 'Saving (Optimized Price Per Hour * Hours)',
      value: ({ item }) => item?.potentialSaving
    }
  ];

  const lastHeaders = [
    {
      key: 'Cost (Price Per Hour * Hours)',
      value: ({ item }) => item?.exactPeriodCost || 0
    }
  ];

  const headers =
    entityTableMode === 'full'
      ? [...firstHeaders, ...additionalFields, ...lastHeaders]
      : [...firstHeaders, ...lastHeaders];

  return (
    <>
      <Modal
        isOpen={modalData}
        contentLabel="K8s Container Modal"
        ariaHideApp={false}
      >
        <Button
          onClick={() => setModal(false)}
          type={Button.TYPE.PRIMARY}
          sizeType={Button.SIZE_TYPE.MEDIUM}
          iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__CLOSE}
        >
          Close
        </Button>
        <br /> <br />
        <Badge type={Badge.TYPE.INFO}>BETA</Badge>
        <HostK8sContainerModal
          entity={modalData}
          setModal={setModal}
          obfuscate={obfuscate}
        />
      </Modal>
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
          {`${groupTitle || 'HOST - Kubernetes'} (${entities.length})`}
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
              const { SystemSample } = item;
              const optimizedType = item.matches?.optimized?.[0];
              const exactType = item.matches?.exact?.[0];

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
                (item?.exactPeriodCost || 0);
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
                    // additionalValue={item.isSpot ? 'spot instance' : ''}
                    additionalValue={item.matches?.exact?.[0]?.type}
                  />
                  <TableRowCell additionalValue={item.cloudRegion}>
                    {item.cloud}
                  </TableRowCell>

                  <TableRowCell onClick={entityOnClick}>
                    {optimizedType ? (
                      <>
                        <Icon
                          color="#0B6ACB"
                          type={Icon.TYPE.INTERFACE__INFO__INFO}
                        />

                        <Badge type={Badge.TYPE.INFO}>Available</Badge>
                      </>
                    ) : (
                      <>
                        <Badge>Not available</Badge>
                      </>
                    )}
                  </TableRowCell>

                  <TableRowCell>
                    {(item?.K8sContainerData || []).length > 0 && (
                      <Button
                        onClick={() => setModal(item)}
                        type={Button.TYPE.PRIMARY}
                        sizeType={Button.SIZE_TYPE.SMALL}
                        iconType={
                          Button.ICON_TYPE
                            .HARDWARE_AND_SOFTWARE__KUBERNETES__K8S_CONTAINER
                        }
                      >
                        Containers&nbsp;({item.K8sContainerData.length})
                      </Button>
                    )}
                  </TableRowCell>

                  {entityTableMode === 'full' && (
                    <>
                      <MetricTableRowCell
                        type={MetricTableRowCell.TYPE.PERCENTAGE}
                        value={SystemSample['max.cpuPercent'] / 100}
                        additionalValue={`Core Count: ${SystemSample?.coreCount}`}
                      />
                      <MetricTableRowCell
                        type={MetricTableRowCell.TYPE.PERCENTAGE}
                        value={SystemSample['max.memoryPercent'] / 100}
                        additionalValue={`Memory GB: ${Math.round(
                          (SystemSample?.memoryGb || 0).toFixed(2)
                        )}`}
                      />
                      <TableRowCell
                        additionalValue={
                          exactType
                            ? `CPU: ${exactType.cpu} Memory: ${exactType.memory}`
                            : undefined
                        }
                      >
                        {exactType?.type}
                      </TableRowCell>
                      <TableRowCell>
                        {item.matches?.exact?.[0]?.onDemandPrice}
                      </TableRowCell>
                      <TableRowCell
                        additionalValue={
                          optimizedType
                            ? `CPU: ${optimizedType.cpu} Memory: ${optimizedType.memory}`
                            : undefined
                        }
                      >
                        {optimizedType?.type}
                      </TableRowCell>
                      <TableRowCell>
                        {optimizedType?.onDemandPrice}
                      </TableRowCell>
                      <TableRowCell>{item.potentialSaving}</TableRowCell>
                    </>
                  )}

                  <TableRowCell>{item.exactPeriodCost}</TableRowCell>
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
