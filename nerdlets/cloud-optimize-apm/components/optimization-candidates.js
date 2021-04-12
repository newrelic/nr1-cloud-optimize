import React from 'react';
import PropTypes from 'prop-types';
import {
  Segment,
  Table,
  Icon,
  Modal,
  Divider,
  Button,
  Grid,
  Header
} from 'semantic-ui-react';
import { navigation } from 'nr1';
import _ from 'lodash';

const monthlyHours = 720;

export default class OptimizationCandidates extends React.Component {
  static propTypes = {
    sorted: PropTypes.array,
    hasCloud: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.state = {
      column: null,
      direction: null,
      data: []
    };
  }

  /* eslint-disable react/no-deprecated */
  // Tracking issue https://github.com/newrelic/nr1-cloud-optimize/issues/38
  componentWillReceiveProps(props) {
    const { sorted } = props;
    this.setState({
      data: sorted && sorted[0] ? sorted[0].instances : []
    });
  }
  /* eslint-enable */

  handleTableSort(clickedColumn) {
    const { data, direction } = this.state;
    if (this.state.column !== clickedColumn) {
      this.setState({
        column: clickedColumn,
        data: _.sortBy(data, [clickedColumn]),
        direction: 'ascending'
      });
      return;
    }

    this.setState({
      column: clickedColumn,
      data: data.reverse(),
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
    const { hasCloud } = this.props;
    const header = hasCloud
      ? 'Optimization Candidates'
      : 'Service does not appear to have any cloud instances.';
    return (
      <>
        <Segment
          style={{ width: '100%', marginLeft: '10px', marginRight: '10px' }}
        >
          <Grid.Row>
            <Grid.Column>
              <Header
                as="h4"
                style={{ textTransform: hasCloud ? 'uppercase' : '' }}
              >
                {header}
              </Header>
            </Grid.Column>
          </Grid.Row>

          <Divider style={{ display: hasCloud ? '' : 'none' }} />

          <Grid.Row style={{ display: hasCloud ? '' : 'none' }}>
            <Grid.Column>
              <Table
                inverted={false}
                striped
                sortable
                size="small"
                ariaLabel=""
              >
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'hostname'
                          ? this.state.direction
                          : null
                      }
                      onClick={() => this.handleTableSort('hostname')}
                    >
                      host
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'maxCpuPercent'
                          ? this.state.direction
                          : null
                      }
                      onClick={() => this.handleTableSort('maxCpuPercent')}
                    >
                      maxCpuPercent
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'maxMemoryPercent'
                          ? this.state.direction
                          : null
                      }
                      onClick={() => this.handleTableSort('maxMemoryPercent')}
                    >
                      maxMemoryPercent
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'transmitBytesPerSecond'
                          ? this.state.direction
                          : null
                      }
                      onClick={() =>
                        this.handleTableSort('transmitBytesPerSecond')
                      }
                    >
                      maxTransmitBytes/s
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'receiveBytesPerSecond'
                          ? this.state.direction
                          : null
                      }
                      onClick={() =>
                        this.handleTableSort('receiveBytesPerSecond')
                      }
                    >
                      maxReceiveBytes/s
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'numCpu'
                          ? this.state.direction
                          : null
                      }
                      onClick={() => this.handleTableSort('numCpu')}
                    >
                      numCpu
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'memGB'
                          ? this.state.direction
                          : null
                      }
                      onClick={() => this.handleTableSort('memGB')}
                    >
                      memGB
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'instanceType'
                          ? this.state.direction
                          : null
                      }
                      onClick={() => this.handleTableSort('instanceType')}
                    >
                      instanceType
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'instancePrice1'
                          ? this.state.direction
                          : null
                      }
                      onClick={() => this.handleTableSort('instancePrice1')}
                    >
                      price /m
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'suggestedInstanceType'
                          ? this.state.direction
                          : null
                      }
                      onClick={() =>
                        this.handleTableSort('suggestedInstanceType')
                      }
                    >
                      suggestedInstanceType
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'instancePrice2'
                          ? this.state.direction
                          : null
                      }
                      onClick={() => this.handleTableSort('instancePrice2')}
                    >
                      suggested price /m
                    </Table.HeaderCell>
                    <Table.HeaderCell
                      sorted={
                        this.state.column === 'saving'
                          ? this.state.direction
                          : null
                      }
                      onClick={() => this.handleTableSort('saving')}
                    >
                      saving /m
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>

                <Table.Body>
                  {this.state.data.map((instance, i) => {
                    if (
                      instance.suggestion &&
                      instance.suggestions &&
                      instance.saving > 0
                    ) {
                      const tempSuggestions =
                        instance.suggestions && instance.suggestions.all
                          ? [...instance.suggestions.all]
                          : [];
                      tempSuggestions.shift();

                      return (
                        <Table.Row
                          key={i}
                          active={instance.suggestedInstanceType === 'stale'}
                        >
                          <Table.Cell
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                              navigation.openStackedEntity(instance.entityGuid)
                            }
                          >
                            {instance.hostname}{' '}
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
            </Grid.Column>
          </Grid.Row>
        </Segment>
      </>
    );
  }
}
