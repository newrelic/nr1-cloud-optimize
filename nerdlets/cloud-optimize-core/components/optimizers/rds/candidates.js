import React from 'react';
import {
  navigation,
  Table,
  TableRow,
  TableRowCell,
  TableHeader,
  TableHeaderCell,
  MetricTableRowCell
} from 'nr1';
import { adjustCost, formatValue } from '../../../../shared/lib/utils';
import { DataConsumer } from '../../../context/data';

export default class InstanceCandidates extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { hidden: true, failures: [] };
  }

  onClickTableHeaderCell = (key, event, sortingData) => {
    this.setState({ [key]: sortingData.nextSortingType });
  };

  onClose = () => {
    this.setState({ hidden: true });
  };

  render() {
    const { tableData, setFailures } = this.props;

    return (
      <DataConsumer>
        {({ costPeriod }) => {
          const tableHdrCell = (name, type, attr, order) => (
            <TableHeaderCell
              value={({ item }) => item[attr]}
              sortable
              sortingType={this.state[attr]}
              sortingOrder={order || undefined}
              onClick={(e, d) => this.onClickTableHeaderCell(attr, e, d)}
            >
              {name}
            </TableHeaderCell>
          );

          const renderRowCell = (v, guid, cost) => (
            <TableRowCell
              onClick={
                guid ? () => navigation.openStackedEntity(guid) : undefined
              }
              style={{
                fontSize: '12px',
                cursor: guid ? 'pointer' : '',
                color: guid ? 'rgb(0, 121, 191)' : ''
              }}
            >
              {cost && !isNaN(v)
                ? formatValue(adjustCost(costPeriod, v), 2)
                : v}
            </TableRowCell>
          );

          const renderMetricRowCell = (type, value) => (
            <MetricTableRowCell
              style={{
                fontSize: '12px'
              }}
              type={type}
              value={value || 0}
            />
          );

          return (
            <Table items={tableData} aria-label="table">
              <TableHeader>
                {tableHdrCell('Name', null, 'name')}

                {tableHdrCell('Connections', null, 'databaseConnections')}

                {tableHdrCell('CPU %', null, 'cpu')}

                {tableHdrCell('Memory %', null, 'memoryUsage')}

                {tableHdrCell('Storage Used', null, 'storageUsage')}

                {tableHdrCell('TX', null, 'tx')}

                {tableHdrCell('RX', null, 'rx')}
                {/* 
                          {tableHdrCell('Read IOPS', null, 'readIops', 7)}

                          {tableHdrCell('Write IOPS', null, 'writeIops', 8)} */}

                {tableHdrCell('VCPU', null, 'vcpu')}

                {tableHdrCell('Memory', null, 'memory')}

                {tableHdrCell('Type', null, 'type')}

                {tableHdrCell('Region', null, 'region')}

                {tableHdrCell('Price', null, 'price')}

                {tableHdrCell('Suggested Type', null, 'suggestedType')}

                {tableHdrCell('Suggested Price', null, 'suggestedPrice')}

                {tableHdrCell('Potential Savings', null, 'potentialSavings')}

                {tableHdrCell('Failing Rules', null, 'noFailures')}
              </TableHeader>

              {({ item }) => (
                <TableRow style={{ backgroundColor: 'red' }}>
                  {renderRowCell(item.name, item.guid)}
                  {renderRowCell(item.databaseConnections)}
                  {item.cpu
                    ? renderMetricRowCell(
                        MetricTableRowCell.TYPE.UNKNOWN,
                        parseFloat(item.cpu.toFixed(2))
                      )
                    : renderRowCell('')}
                  {item.memoryUsage
                    ? renderMetricRowCell(
                        MetricTableRowCell.TYPE.UNKNOWN,
                        parseFloat((item.memoryUsage || 0).toFixed(2))
                      )
                    : renderRowCell('')}
                  {item.storageUsage
                    ? renderMetricRowCell(
                        MetricTableRowCell.TYPE.UNKNOWN,
                        parseFloat(item.storageUsage.toFixed(2))
                      )
                    : renderRowCell('')}
                  {renderMetricRowCell(
                    MetricTableRowCell.TYPE.UNKNOWN,
                    item.tx
                  )}
                  {renderMetricRowCell(
                    MetricTableRowCell.TYPE.UNKNOWN,
                    item.rx
                  )}

                  {renderRowCell(item.vcpu)}
                  {renderRowCell(item.memory)}
                  {renderRowCell(item.type)}
                  {renderRowCell(item.region)}
                  {renderRowCell(item.price, null, true)}

                  {renderRowCell(item.isStale ? 'STALE' : item.suggestedType)}
                  {renderRowCell(item.suggestedPrice, null, true)}
                  {renderRowCell(item.potentialSavings, null, true)}

                  <TableRowCell
                    style={{
                      fontSize: '12px',
                      color: item.passing === 'FALSE' ? 'red' : 'green',
                      fontWeight: 'bold',
                      cursor: item.passing === 'FALSE' ? 'pointer' : 'none'
                    }}
                    onClick={() =>
                      item.passing === 'FALSE'
                        ? setFailures({
                            hidden: false,
                            failures: [...item.failures]
                          })
                        : undefined
                    }
                  >
                    {item.passing === 'FALSE' ? 'FAIL' : 'PASS'}{' '}
                    {item.passing === 'FALSE'
                      ? ` (${item.failures.length})`
                      : ''}
                  </TableRowCell>
                </TableRow>
              )}
            </Table>
          );
        }}
      </DataConsumer>
    );
  }
}
