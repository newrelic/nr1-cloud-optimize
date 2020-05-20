import React from 'react';
import { DataConsumer, categoryTypes } from '../../context/data';
import { Card, Icon } from 'semantic-ui-react';

export default class Tiles extends React.PureComponent {
  render() {
    return (
      <DataConsumer>
        {({ groupedEntities, workloadEntities, updateDataState }) => {
          let instanceEntities = 0;

          categoryTypes.instances.forEach(type => {
            instanceEntities += (groupedEntities[type] || []).length;
          });

          const workloadsCount = (workloadEntities || []).length;

          return (
            <>
              {/* <Message floating style={{ borderRadius: 0 }}>
                <Message.List>
                  <Message.Item>
                    Select an option below to view optimization suggestions.
                  </Message.Item>
                </Message.List>
              </Message> */}
              <Card.Group centered>
                <Card>
                  <Card.Content>
                    <Card.Header
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        updateDataState({ selectedPage: 'instance-optimizer' })
                      }
                    >
                      Instances{' '}
                      <Icon style={{ float: 'right' }} name="server" />
                    </Card.Header>
                    <Card.Meta>
                      <span className="date">
                        Optimize your instances and hosts.
                      </span>
                    </Card.Meta>

                    {/* <Card.Description>
                      Matthew is a musician living in Nashville.
                    </Card.Description> */}
                  </Card.Content>
                  <Card.Content extra>
                    <a>
                      <Icon name="cubes" />
                      {instanceEntities} Entities
                    </a>{' '}
                  </Card.Content>
                </Card>
                <Card>
                  <Card.Content>
                    <Card.Header>
                      Workloads{' '}
                      <Icon style={{ float: 'right' }} name="circle" />
                    </Card.Header>
                    <Card.Meta>
                      <span className="date">
                        Optimize the entities within your workloads.
                      </span>
                    </Card.Meta>

                    {/* <Card.Description>
                      Matthew is a musician living in Nashville.
                    </Card.Description> */}
                  </Card.Content>
                  <Card.Content extra>
                    <a>
                      <Icon name="cubes" />
                      {workloadsCount} Workloads
                    </a>{' '}
                  </Card.Content>
                </Card>
              </Card.Group>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
