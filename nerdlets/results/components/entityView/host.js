import React, { useState } from 'react';
import {
  Layout,
  LayoutItem,
  Stack,
  StackItem,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  HeadingText,
  navigation,
  MetricTableRowCell
} from 'nr1';

// eslint-disable-next-line no-unused-vars
export default function HostView(props) {
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

  return (
    <>
      <HeadingText
        type={HeadingText.TYPE.HEADING_4}
        style={{ paddingBottom: '0px', marginBottom: '0px' }}
      >
        HOSTS
      </HeadingText>

      <Table items={entities} multiValue>
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
              column === 2 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(2, data)}
            value={({ item }) => item?.SystemSample?.['max.memoryPercent']}
            alignmentType={TableHeaderCell.ALIGNMENT_TYPE.RIGHT}
          >
            Max Mem %
          </TableHeaderCell>
          <TableHeaderCell
            sortable
            sortingType={
              column === 3 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(3, data)}
            value={({ item }) => item.matches?.exact?.[0].type}
          >
            Type
          </TableHeaderCell>
          <TableHeaderCell
            sortable
            sortingType={
              column === 4 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(4, data)}
            value={({ item }) => item.matches?.exact?.[0].onDemandPrice}
          >
            Cost
          </TableHeaderCell>
          <TableHeaderCell
            sortable
            sortingType={
              column === 5 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(5, data)}
            value={({ item }) => item.matches?.optimized?.[0].type}
          >
            Optimized Type
          </TableHeaderCell>
          <TableHeaderCell
            sortable
            sortingType={
              column === 6 ? sortingType : TableHeaderCell.SORTING_TYPE.NONE
            }
            onClick={(event, data) => onClickTableHeaderCell(6, data)}
            value={({ item }) => item.matches?.optimized?.[0].onDemandPrice}
          >
            Cost
          </TableHeaderCell>
        </TableHeader>

        {({ item }) => {
          const { SystemSample } = item;

          return (
            <TableRow actions={entities}>
              <TableRowCell
                onClick={() => {
                  // const nerdlet = {
                  //   id: 'results-nerdlet',
                  //   urlState: {}
                  // };

                  // navigation.openStackedNerdlet(nerdlet);

                  navigation.openStackedEntity(item.guid);
                }}
              >
                {item.name}
              </TableRowCell>
              <TableRowCell additionalValue={item.region}>
                {item.cloud}
              </TableRowCell>
              <MetricTableRowCell
                type={MetricTableRowCell.TYPE.PERCENTAGE}
                value={SystemSample['max.cpuPercent'] / 100}
              />
              <MetricTableRowCell
                type={MetricTableRowCell.TYPE.PERCENTAGE}
                value={SystemSample['max.memoryPercent'] / 100}
              />
              <TableRowCell>{item.matches?.exact?.[0].type}</TableRowCell>
              <TableRowCell>
                {item.matches?.exact?.[0].onDemandPrice}
              </TableRowCell>
              <TableRowCell>{item.matches?.optimized?.[0]?.type}</TableRowCell>
              <TableRowCell>
                {item.matches?.optimized?.[0]?.onDemandPrice}
              </TableRowCell>
            </TableRow>
          );
        }}
      </Table>
    </>
  );
}
