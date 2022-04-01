import React, { useState } from 'react';
import {
  navigation,
  Button,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  MetricTableRowCell,
  EntityTitleTableRowCell,
  Card,
  CardHeader,
  CardBody
} from 'nr1';
import Modal from 'react-modal';
import HostK8sContainerModal from './HOSTK8SCONTAINERMODAL';

// eslint-disable-next-line no-unused-vars
export default function HostView(props) {
  const { entities } = props;
  const [column, setColumn] = useState(0);
  const [modalData, setModal] = useState(false);
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

  const cost = {
    known: 0,
    optimized: 0,
    estimated: 0,
    potentialSaving: 0,
    exactPeriodCost: 0
  };
  entities.forEach(e => {
    if (e.spot) {
      const spotPrice = e?.matches?.exact?.[0]?.spotPrice?.[0]?.price;
      if (spotPrice) {
        cost.known = cost.known + spotPrice;
      }

      // needs work
      // const optimizedSpotPrice =
      //   e?.matches?.optimized?.[0]?.spotPrice?.[0]?.price;
      // if (optimizedSpotPrice) {
      //   cost.optimized = cost.optimized + optimizedSpotPrice;
      //   cost.potentialSaving = spotPrice - optimizedSpotPrice;
      // }
    } else {
      const onDemandPrice = e?.matches?.exact?.[0]?.onDemandPrice;
      if (onDemandPrice) {
        cost.known = cost.known + onDemandPrice;
      }

      const estimatedPrice = e?.matches?.estimated?.[0]?.onDemandPrice;
      if (estimatedPrice) {
        cost.estimated = cost.estimated + estimatedPrice;
      }

      const optimizedOnDemandPrice = e?.matches?.optimized?.[0]?.onDemandPrice;
      if (optimizedOnDemandPrice) {
        cost.optimized = cost.optimized + optimizedOnDemandPrice;
        cost.potentialSaving = cost.potentialSaving + e.potentialSaving;
      }

      if (e.exactPeriodCost) {
        cost.exactPeriodCost = cost.exactPeriodCost + e.exactPeriodCost;
      }
    }
  });

  return (
    <>
      <Modal isOpen={modalData} contentLabel="Minimal Modal Example">
        <Button
          onClick={() => setModal(false)}
          type={Button.TYPE.PRIMARY}
          sizeType={Button.SIZE_TYPE.MEDIUM}
          iconType={Button.ICON_TYPE.INTERFACE__OPERATIONS__CLOSE}
        >
          Close
        </Button>
        <HostK8sContainerModal entity={modalData} setModal={setModal} />
      </Modal>
      <Card collapsible style={{ marginLeft: '0px' }}>
        <CardHeader
          style={{ marginLeft: '0px', width: '80%' }}
          title={`HOST (${entities.length})`}
        />
        <CardBody
          style={{ marginLeft: '0px', marginRight: '0px', marginBottom: '0px' }}
        >
          <Table items={entities} multivalue>
            <TableHeader>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 0 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(0, data)}
                value={({ item }) => item.name}
              >
                Name
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 1 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(1, data)}
                value={({ item }) => item.cloud}
              >
                Cloud
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 2 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(2, data)}
                value={({ item }) => item?.SystemSample?.['max.cpuPercent']}
                alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
              >
                Max CPU %
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 3 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(3, data)}
                value={({ item }) => item?.SystemSample?.['max.memoryPercent']}
                alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
              >
                Max Mem %
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 4 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(4, data)}
                value={({ item }) => item.matches?.exact?.[0].type}
              >
                Type
              </TableHeaderCell>
              <TableHeaderCell
                width="7%"
                sortable
                sortingType={
                  column === 5 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(5, data)}
                value={({ item }) => item.matches?.exact?.[0].onDemandPrice}
              >
                Price Per Hour
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sortingType={
                  column === 6 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(5, data)}
                value={({ item }) => item.matches?.optimized?.[0].type}
              >
                Optimized Type
              </TableHeaderCell>
              <TableHeaderCell
                width="7%"
                sortable
                sortingType={
                  column === 7 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(6, data)}
                value={({ item }) => item.matches?.optimized?.[0].onDemandPrice}
              >
                Optimized Price Per Hour
              </TableHeaderCell>
              <TableHeaderCell
                width="7%"
                sortable
                sortingType={
                  column === 7 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(7, data)}
                value={({ item }) => item.potentialSaving}
              >
                Saving (Optimized Price Per Hour * Hours)
              </TableHeaderCell>
              <TableHeaderCell
                width="7%"
                sortable
                sortingType={
                  column === 8 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
                }
                onClick={(event, data) => onClickTableHeaderCell(8, data)}
                value={({ item }) => item.exactPeriodCost}
              >
                Cost (Price Per Hour * Hours)
              </TableHeaderCell>
              <TableHeaderCell>&nbsp;</TableHeaderCell>
            </TableHeader>

            {({ item }) => {
              const { SystemSample } = item;
              const optimizedType = item.matches?.optimized?.[0];

              return (
                <TableRow actions={[]}>
                  {/* <TableRowCell
                onClick={() =>
                  window.open(
                    ` https://one.newrelic.com/redirect/entity/${item.guid}`,
                    '_blank'
                  )
                }
                additionalValue={item.isSpot ? 'spot instance' : ''}
              >
                {item.name}
              </TableRowCell> */}
                  <EntityTitleTableRowCell
                    value={item}
                    onClick={() => navigation.openStackedEntity(item.guid)}
                    additionalValue={item.isSpot ? 'spot instance' : ''}
                  />
                  <TableRowCell additionalValue={item.cloudRegion}>
                    {item.cloud}
                  </TableRowCell>
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
                  <TableRowCell>{item.matches?.exact?.[0].type}</TableRowCell>
                  <TableRowCell>
                    {item.matches?.exact?.[0].onDemandPrice}
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
                  <TableRowCell>{optimizedType?.onDemandPrice}</TableRowCell>
                  <TableRowCell>{item.potentialSaving}</TableRowCell>
                  <TableRowCell>{item.exactPeriodCost}</TableRowCell>
                  <TableRowCell>
                    {item.K8sContainerData && item.K8sContainerData.length > 0 && (
                      <Button
                        onClick={() => setModal(item)}
                        type={Button.TYPE.PRIMARY}
                        sizeType={Button.SIZE_TYPE.SMALL}
                        iconType={
                          Button.ICON_TYPE
                            .HARDWARE_AND_SOFTWARE__KUBERNETES__K8S_CONTAINER
                        }
                      >
                        K8s Containers&nbsp;({item.K8sContainerData.length})
                      </Button>
                    )}
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
              <TableHeaderCell width="7%" />
              <TableHeaderCell width="7%" />
              <TableHeaderCell width="7%" />
              <TableHeaderCell width="7%" />
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
                  <TableRowCell>Total</TableRowCell>
                  <TableRowCell>{cost.known}</TableRowCell>
                  <TableRowCell>{cost.optimized}</TableRowCell>
                  <TableRowCell>{cost.potentialSaving}</TableRowCell>
                  <TableRowCell>{cost.exactPeriodCost}</TableRowCell>
                  <TableRowCell />
                </TableRow>
              );
            }}
          </Table>
        </CardBody>
      </Card>
    </>
  );
}
