import React from 'react';
import { Modal, Button, Form, Icon, Dropdown } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';
import { writeEntityDocument } from '../../../shared/lib/utils';

const periods = Array.from(Array(61).keys());
periods.shift();

const periodOptions = periods.map((p) => ({
  key: p,
  text: p,
  value: p
}));

export default class AddCost extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      recurringMonths: 12,
      title: '',
      description: '',
      units: 0,
      rate: 0,
      currency: 'USD',
      saving: false
    };
  }

  changeValue = (field, value) => {
    this.setState({ [field]: value });
  };

  saveCost = (dc, selectedCost, getWorkloadDocs) => {
    this.setState({ saving: true }, async () => {
      const {
        recurringMonths,
        title,
        description,
        units,
        rate,
        currency
      } = this.state;
      const dcDoc = dc.dcDoc || {};

      if (!dcDoc.costs) dcDoc.costs = {};
      if (!dcDoc.costs[selectedCost]) dcDoc.costs[selectedCost] = [];

      dcDoc.costs[selectedCost].push({
        selectedCost,
        recurringMonths: parseFloat(recurringMonths || 12),
        title,
        description,
        units: parseFloat(units || 0),
        rate: parseFloat(rate || 0),
        currency
      });

      await writeEntityDocument(dc.guid, 'dcDoc', 'dcDoc', dcDoc);
      getWorkloadDocs(dc.guid);
      this.clearForm();
      // dataFetcher(['datacenters']);
    });
  };

  clearForm = () => {
    this.setState({
      recurringMonths: 12,
      title: '',
      description: '',
      units: 0,
      rate: 0,
      currency: 'USD',
      saving: false
    });
  };

  render() {
    const {
      recurringMonths,
      title,
      description,
      units,
      rate,
      saving
    } = this.state;
    const { selectedCost, button } = this.props;

    let addDisabled = false;

    if (title === '') addDisabled = true;
    if (isNaN(units)) addDisabled = true;
    if (isNaN(rate)) addDisabled = true;
    if (isNaN(recurringMonths)) addDisabled = true;

    return (
      <DataConsumer>
        {({ workloadEntities, selectedWorkload, getWorkloadDocs }) => {
          const dc = workloadEntities.filter(
            (d) => d.name === selectedWorkload
          )[0];

          return (
            <Modal
              closeIcon
              trigger={
                button ? (
                  <Button content="Add" icon="add" />
                ) : (
                  <Icon
                    name="add"
                    size="small"
                    style={{ cursor: 'pointer', paddingBottom: '12px' }}
                  />
                )
              }
            >
              <Modal.Header>Add {selectedCost} Cost</Modal.Header>
              <Modal.Content>
                <Form size="tiny">
                  <Form.Group>
                    <Form.Input
                      width="8"
                      fluid
                      label="Title"
                      placeholder="Title"
                      value={title}
                      onChange={(e, d) => this.changeValue('title', d.value)}
                    />
                    <Form.Input
                      width="8"
                      fluid
                      label="Description"
                      placeholder="Description"
                      value={description}
                      onChange={(e, d) =>
                        this.changeValue('description', d.value)
                      }
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Field width="6">
                      <label>Monthly recurrence</label>
                      <Dropdown
                        className="singledrop"
                        width="8"
                        placeholder="Months"
                        search
                        selection
                        options={periodOptions}
                        value={recurringMonths}
                        onChange={(e, d) =>
                          this.setState({ recurringMonths: d.value })
                        }
                      />
                    </Form.Field>
                    <Form.Input
                      width="6"
                      fluid
                      label="Units"
                      placeholder="Units"
                      value={units}
                      onChange={(e, d) => this.changeValue('units', d.value)}
                    />
                    <Form.Input
                      width="6"
                      fluid
                      label="Unit Rate"
                      placeholder="$"
                      value={rate}
                      onChange={(e, d) => this.changeValue('rate', d.value)}
                    />
                  </Form.Group>
                </Form>
              </Modal.Content>
              <Modal.Actions>
                <Button
                  style={{ float: 'right', marginBottom: '10px' }}
                  negative
                  size="tiny"
                  onClick={this.clearForm}
                >
                  Clear
                </Button>
                <Button
                  style={{ float: 'right' }}
                  positive
                  size="tiny"
                  disabled={addDisabled}
                  loading={saving}
                  onClick={() =>
                    this.saveCost(dc, selectedCost, getWorkloadDocs)
                  }
                >
                  Add
                </Button>
              </Modal.Actions>
            </Modal>
          );
        }}
      </DataConsumer>
    );
  }
}
