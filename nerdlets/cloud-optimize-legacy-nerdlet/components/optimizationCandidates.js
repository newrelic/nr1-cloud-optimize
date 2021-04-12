import React from 'react';
import PropTypes from 'prop-types';
import { Button, Table, Icon, Modal } from 'semantic-ui-react';
import CsvDownload from 'react-json-to-csv';
import _ from 'lodash';

const monthlyHours = 720;

export default class OptimizationCandidates extends React.Component {
  static propTypes = {
    instances: PropTypes.array,
    header: PropTypes.oneOfType([PropTypes.string, PropTypes.object])
  };

  constructor(props) {
    super(props);
    this.state = {
      column: null,
      direction: null,
      modalInstanceData: []
    };
  }

  handleTableSort(clickedColumn) {
    const { modalInstanceData, direction } = this.state;
    if (this.state.column !== clickedColumn) {
      this.setState({
        column: clickedColumn,
        modalInstanceData: _.sortBy(modalInstanceData, [clickedColumn]),
        direction: 'ascending'
      });
      return;
    }

    this.setState({
      column: clickedColumn,
      modalInstanceData: modalInstanceData.reverse(),
      direction: direction === 'ascending' ? 'descending' : 'ascending'
    });
  }

  renderSuggestionsModal(suggestedInstanceType, suggestions) {
    return (
      <Modal
        trigger={
          <Button
            style={{ width: '100%' }}
            size="mini"
            inverted={false}
            content={
              <span>
                {suggestedInstanceType}&nbsp;
                <Icon
                  style={{ float: 'right' }}
                  name="list alternate outline"
                />
              </span>
            }
          />
        }
      >
        <Modal.Header>Alternate Suggestions</Modal.Header>
        <Modal.Content>
          <Table inverted={false} striped compact aria-label="table">
            <Table.Header>
              <Table.HeaderCell>instanceType</Table.HeaderCell>
              <Table.HeaderCell>instanceFamily</Table.HeaderCell>
              <Table.HeaderCell>cpu</Table.HeaderCell>
              <Table.HeaderCell>mem</Table.HeaderCell>
              <Table.HeaderCell>price /m</Table.HeaderCell>
            </Table.Header>
            <Table.Body>
              {suggestions.map((suggestion, i) => {
                return (
                  <Table.Row key={i}>
                    <Table.Cell>{suggestion.instanceType}</Table.Cell>
                    <Table.Cell>{suggestion.instanceFamily}</Table.Cell>
                    <Table.Cell>{suggestion.vcpu}</Table.Cell>
                    <Table.Cell>{suggestion.memory}</Table.Cell>
                    <Table.Cell>
                      {(suggestion.price * monthlyHours)
                        .toFixed(2)
                        .replace(/\d(?=(\d{3})+\.)/g, '$&,')}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </Modal.Content>
      </Modal>
    );
  }

  render() {
    const { instances, header } = this.props;
    const { direction, column } = this.state;
    const exported = [...instances]
      .filter(instance => instance.suggestion || instance.saving > 0)
      .map(instance => {
        const instanceData = { ...instance };
        // delete arrays and objects to avoid any issues with csv export
        delete instanceData.suggestions;
        delete instanceData.hostnameapmApplicationNamesentityGuidawsRegion;
        if (instanceData.matchedInstance) {
          instanceData.matchedInstanceType = instanceData.matchedInstance.type;
          instanceData.matchedInstanceCategory =
            instanceData.matchedInstance.category;
          instanceData.matchedInstancePrice =
            instanceData.matchedInstance.onDemandPrice;
        }
        for (let z = 0; z < Object.keys(instanceData).length; z++) {
          if (Array.isArray(instanceData[Object.keys(instanceData)[z]])) {
            delete instanceData[Object.keys(instanceData)[z]];
          }
        }
        return instanceData;
      });

    return (
      <Modal
        size="fullscreen"
        trigger={
          <Button
            size="mini"
            onClick={() =>
              this.setState({
                modalInstanceData: instances,
                column: null,
                direction: null
              })
            }
          >
            Show Optimization Candidates
          </Button>
        }
      >
        <Modal.Header>
          Optimization Candidates - {header}
          <span style={{ float: 'right' }}>
            <CsvDownload
              style={{
                borderRadius: '6px',
                border: '1px solid #000000',
                display: 'inline-block',
                fontSize: '15px',
                fontWeight: 'bold',
                padding: '6px 24px',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
              data={exported}
            >
              Export Data
            </CsvDownload>
          </span>
        </Modal.Header>
        <Modal.Content>
          <Table
            inverted={false}
            striped
            sortable
            size="small"
            ariaLabel="table"
          >
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell
                  sorted={column === 'hostname' ? direction : null}
                  onClick={() => this.handleTableSort('hostname')}
                >
                  host
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'entityName' ? direction : null}
                  onClick={() => this.handleTableSort('entityName')}
                >
                  entity
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'maxCpuPercent' ? direction : null}
                  onClick={() => this.handleTableSort('maxCpuPercent')}
                >
                  maxCpuPercent
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'maxMemoryPercent' ? direction : null}
                  onClick={() => this.handleTableSort('maxMemoryPercent')}
                >
                  maxMemoryPercent
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={
                    column === 'transmitBytesPerSecond' ? direction : null
                  }
                  onClick={() => this.handleTableSort('transmitBytesPerSecond')}
                >
                  maxTransmitBytes/s
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'receiveBytesPerSecond' ? direction : null}
                  onClick={() => this.handleTableSort('receiveBytesPerSecond')}
                >
                  maxReceiveBytes/s
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'numCpu' ? direction : null}
                  onClick={() => this.handleTableSort('numCpu')}
                >
                  numCpu
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'memGB' ? direction : null}
                  onClick={() => this.handleTableSort('memGB')}
                >
                  memGB
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'instanceType' ? direction : null}
                  onClick={() => this.handleTableSort('instanceType')}
                >
                  instanceType
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'instancePrice1' ? direction : null}
                  onClick={() => this.handleTableSort('instancePrice1')}
                >
                  price /m
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'suggestedInstanceType' ? direction : null}
                  onClick={() => this.handleTableSort('suggestedInstanceType')}
                >
                  suggestedInstanceType
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'instancePrice2' ? direction : null}
                  onClick={() => this.handleTableSort('instancePrice2')}
                >
                  suggested price /m
                </Table.HeaderCell>
                <Table.HeaderCell
                  sorted={column === 'saving' ? direction : null}
                  onClick={() => this.handleTableSort('saving')}
                >
                  saving /m
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {this.state.modalInstanceData.map((instance, i) => {
                if (instance.suggestion && instance.saving > 0) {
                  const tempSuggestions =
                    instance.suggestions && instance.suggestions.all
                      ? [...instance.suggestions.all]
                      : [];
                  tempSuggestions.shift();

                  const link = `https://one.newrelic.com/redirect/entity/${instance.entityGuid}`;
                  return (
                    <Table.Row
                      key={i}
                      active={instance.suggestedInstanceType === 'stale'}
                    >
                      <Table.Cell>
                        <a
                          style={{
                            color:
                              instance.suggestedInstanceType === 'stale'
                                ? 'black'
                                : 'black'
                          }}
                          href={link}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {instance.hostname}
                        </a>
                      </Table.Cell>
                      <Table.Cell>
                        <a
                          style={{
                            color:
                              instance.suggestedInstanceType === 'stale'
                                ? 'black'
                                : 'black'
                          }}
                          href={link}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {instance.entityName}{' '}
                        </a>
                      </Table.Cell>
                      <Table.Cell>
                        {instance.maxCpuPercent.toFixed(2)}
                      </Table.Cell>
                      <Table.Cell>
                        {instance.maxMemoryPercent.toFixed(2)}
                      </Table.Cell>
                      <Table.Cell>
                        {instance.transmitBytesPerSecond.toFixed(2)}
                      </Table.Cell>
                      <Table.Cell>
                        {instance.receiveBytesPerSecond.toFixed(2)}
                      </Table.Cell>
                      <Table.Cell>{instance.numCpu}</Table.Cell>
                      <Table.Cell>{instance.memGB}</Table.Cell>
                      <Table.Cell>{instance.instanceType}</Table.Cell>
                      <Table.Cell>
                        {(instance.instancePrice1 * monthlyHours)
                          .toFixed(2)
                          .replace(/\d(?=(\d{3})+\.)/g, '$&,')}
                      </Table.Cell>
                      <Table.Cell style={{ textAlign: 'center' }}>
                        {tempSuggestions.length > 0
                          ? this.renderSuggestionsModal(
                              instance.suggestedInstanceType,
                              tempSuggestions
                            )
                          : instance.suggestedInstanceType}
                      </Table.Cell>
                      <Table.Cell>
                        {(instance.instancePrice2 * monthlyHours)
                          .toFixed(2)
                          .replace(/\d(?=(\d{3})+\.)/g, '$&,')}
                      </Table.Cell>
                      <Table.Cell>
                        {(instance.saving * monthlyHours)
                          .toFixed(2)
                          .replace(/\d(?=(\d{3})+\.)/g, '$&,')}
                      </Table.Cell>
                    </Table.Row>
                  );
                } else {
                  return null;
                }
              })}
            </Table.Body>
          </Table>
        </Modal.Content>
      </Modal>
    );
  }
}
