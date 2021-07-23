import React from 'react';
import { WorkloadsConsumer } from './context';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  EntityTitleTableRowCell
} from 'nr1';

export default class WorkloadTable extends React.PureComponent {
  render() {
    const { height, selectWorkload } = this.props;
    return (
      <WorkloadsConsumer>
        {({ completeEntities }) => {
          return (
            <Table items={completeEntities} style={{ height }}>
              <TableHeader>
                <TableHeaderCell>Workload</TableHeaderCell>
                <TableHeaderCell>Entities</TableHeaderCell>
              </TableHeader>

              {({ item }) => (
                <TableRow>
                  <EntityTitleTableRowCell
                    value={item}
                    style={{ cursor: 'pointer' }}
                    onClick={() => selectWorkload(item)}
                  />
                  <TableRowCell>
                    {(item?.relatedEntities?.results || []).length}
                  </TableRowCell>
                </TableRow>
              )}
            </Table>
          );
        }}
      </WorkloadsConsumer>
    );
  }
}
