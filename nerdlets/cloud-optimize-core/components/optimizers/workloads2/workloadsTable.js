import React from 'react';
import { WorkloadsConsumer } from './context';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  EntityTitleTableRowCell,
  TextField
} from 'nr1';

export default class WorkloadTable extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { searchText: '' };
  }

  render() {
    const { height, selectWorkload } = this.props;
    const { searchText } = this.state;

    return (
      <WorkloadsConsumer>
        {({ completeEntities }) => {
          const searchedEntities = (completeEntities || []).filter(e =>
            e.name.toLowerCase().includes(searchText.toLowerCase())
          );

          return (
            <>
              <div style={{ paddingTop: '5px' }}>
                <TextField
                  style={{ width: '100%' }}
                  type={TextField.TYPE.SEARCH}
                  placeholder={`Search ${
                    (completeEntities || []).length
                  } workloads...`}
                  onChange={e => this.setState({ searchText: e.target.value })}
                />
              </div>

              <Table items={searchedEntities} style={{ height }}>
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
            </>
          );
        }}
      </WorkloadsConsumer>
    );
  }
}
