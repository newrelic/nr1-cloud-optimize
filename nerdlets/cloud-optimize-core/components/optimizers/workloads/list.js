import React from 'react';
import { Segment, Button } from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell
} from 'nr1';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';

export default class WorkloadList extends React.PureComponent {
  render() {
    const { groupData } = this.props;

    const getActions = updateDataState => {
      return [
        {
          label: 'View Workload',
          onClick: (evt, { item }) => {
            window.open(
              ` https://one.newrelic.com/redirect/entity/${item.guid}`,
              '_blank'
            );
          }
        },
        {
          label: 'View Optimization Results',
          onClick: (evt, { item }) => {
            updateDataState({
              selectedWorkload: item.guid
            });
          }
        }
      ];
    };

    return (
      <DataConsumer>
        {({ updateDataState, selectedWorkload, costPeriod }) => {
          const renderRowCell = (v, guid, paddingLeft, cost) => (
            <TableRowCell
              onClick={
                guid
                  ? () =>
                      updateDataState({
                        selectedWorkload: selectedWorkload ? null : guid
                      })
                  : null
              }
              style={{
                fontSize: '12px',
                cursor: guid ? 'pointer' : '',
                color: guid ? 'rgb(0, 121, 191)' : '',
                paddingLeft: `${paddingLeft || 0}px`
              }}
            >
              {cost && !isNaN(v)
                ? formatValue(adjustCost(costPeriod, v), 2)
                : v}
            </TableRowCell>
          );

          const items = groupData.entities.filter(e =>
            selectedWorkload ? selectedWorkload === e.guid : true
          );

          return (
            <>
              {selectedWorkload ? (
                <>
                  <Button
                    onClick={() =>
                      updateDataState({
                        selectedWorkload: null
                      })
                    }
                    color="instagram"
                    content="BACK"
                    size="mini"
                    compact
                    labelPosition="left"
                    icon="left arrow"
                  />
                  &nbsp;
                </>
              ) : (
                ''
              )}
              <Segment
                raised
                style={{ display: items.length === 1 ? 'none' : '' }}
              >
                <Table items={items}>
                  <TableHeader>
                    <TableHeaderCell
                      width="50%"
                      style={{ paddingLeft: '10px' }}
                    >
                      Name
                    </TableHeaderCell>
                    <TableHeaderCell>Account</TableHeaderCell>
                    <TableHeaderCell>Optimization Config</TableHeaderCell>
                    <TableHeaderCell>Entities</TableHeaderCell>
                    <TableHeaderCell>Current Spend</TableHeaderCell>
                    <TableHeaderCell>Potential Savings</TableHeaderCell>
                  </TableHeader>

                  {({ item }) => (
                    <TableRow actions={getActions(updateDataState)}>
                      {renderRowCell(item.name, item.guid, 10)}
                      {renderRowCell(item.account.name, null, 10)}
                      {renderRowCell(
                        item.optimizationConfig ? 'True' : 'False',
                        null,
                        10
                      )}
                      {renderRowCell(item.entityData.length, null, 10)}
                      {renderRowCell(
                        item.metrics.instances.currentSpend,
                        null,
                        10,
                        true
                      )}
                      {renderRowCell(
                        item.metrics.instances.potentialSavings,
                        null,
                        10,
                        true
                      )}
                    </TableRow>
                  )}
                </Table>
              </Segment>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
