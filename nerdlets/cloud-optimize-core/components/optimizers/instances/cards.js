import React from 'react';
import { Card, Icon } from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';

export default class InstanceCards extends React.PureComponent {
  render() {
    const { groups } = this.props;
    return (
      <DataConsumer>
        {({ test }) => {
          return (
            <Card.Group centered>
              {groups.map((g, i) => {
                return (
                  <Card key={i}>
                    <Card.Content>
                      <Card.Header>
                        {g.name === 'undefined' ? 'Uncategorized' : g.name}
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
                        {g.entities.length} Entities
                      </a>{' '}
                    </Card.Content>
                  </Card>
                );
              })}
            </Card.Group>
          );
        }}
      </DataConsumer>
    );
  }
}
