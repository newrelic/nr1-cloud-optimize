import React from 'react';
import { DataConsumer, categoryTypes } from '../../context/data';
import { Card, Icon } from 'semantic-ui-react';
import workloadsIcon from '../../../shared/images/workloads.png';

const optimizers = [
  {
    name: 'Instances',
    optimizer: 'instance',
    desc: 'Optimize your instances and hosts.',
    cat: 'instances',
    icon: 'server'
  },
  {
    name: 'Workloads',
    optimizer: 'workload',
    desc: 'Optimize the entities within your workloads.',
    cat: 'workloads',
    img: workloadsIcon
  },
  {
    name: 'Amazon RDS',
    optimizer: 'rds',
    desc: 'Optimize Amazon RDS Entities',
    cat: 'database',
    icon: 'database',
    hideEntityCount: true
  }
];

export default class Tiles extends React.PureComponent {
  render() {
    return (
      <DataConsumer>
        {({ groupedEntities, workloadEntities, updateDataState }) => {
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
                {optimizers.map((o, i) => {
                  groupedEntities.WORKLOAD = workloadEntities;
                  let count = 0;
                  categoryTypes[o.cat].forEach(type => {
                    count += (groupedEntities[type] || []).length;
                  });

                  return (
                    <Card key={i}>
                      <Card.Content>
                        <Card.Header
                          style={{ cursor: 'pointer' }}
                          onClick={() =>
                            updateDataState({
                              selectedPage: `${o.optimizer}-optimizer`,
                              selectedWorkload: null
                            })
                          }
                        >
                          {o.name}&nbsp;
                          {o.icon ? (
                            <Icon style={{ float: 'right' }} name={o.icon} />
                          ) : (
                            ''
                          )}
                          {o.img ? (
                            <img
                              style={{ float: 'right', height: '25px' }}
                              src={o.img}
                            />
                          ) : (
                            ''
                          )}
                        </Card.Header>

                        <Card.Meta>
                          <span className="date">{o.desc}</span>
                        </Card.Meta>
                      </Card.Content>

                      <Card.Content extra>
                        <span
                          style={{
                            float: 'left',
                            display: o.hideEntityCount ? 'none' : ''
                          }}
                        >
                          <Icon name="cubes" />
                          {count}&nbsp;
                          {count.length === 1 ? 'Entity' : 'Entities'}
                        </span>

                        <span
                          style={{
                            float: 'right',
                            display: o.optimizer === 'workload' ? '' : 'none'
                          }}
                        >
                          <a
                            href="https://one.newrelic.com/launcher/workloads.home"
                            rel="noopener noreferrer"
                            target="_blank"
                            style={{
                              color: '#0079BF'
                            }}
                          >
                            Create Workloads
                          </a>
                        </span>
                      </Card.Content>
                    </Card>
                  );
                })}
              </Card.Group>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
