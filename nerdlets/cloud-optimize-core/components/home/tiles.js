import React from 'react';
import { DataConsumer, categoryTypes } from '../../context/data';
import { Card, Icon } from 'semantic-ui-react';
import workloadsIcon from '../../../shared/images/workloads.png';
import awsIcon from '../../../shared/images/awsIcon.png';

// import awsIcon from '../../../../shared/images/awsIcon.png';

export default class Tiles extends React.PureComponent {
  render() {
    return (
      <DataConsumer>
        {({
          runInstanceOptimizer,
          groupedEntities,
          workloadEntities,
          updateDataState,
          entityCountRds,
          entityCountHost,
          entityCountWorkload
        }) => {
          const optimizers = [
            {
              name: 'Instances',
              optimizer: 'instance',
              desc: 'Optimize your instances and hosts.',
              cat: 'instances',
              icon: 'server',
              run: runInstanceOptimizer
            },
            {
              name: 'Workloads',
              optimizer: 'workload',
              desc: 'Optimize the entities within your workloads.',
              cat: 'workloads',
              img: workloadsIcon,
              link: 'https://one.newrelic.com/launcher/workloads.home',
              linkName: 'Create Workloads',
              run: runInstanceOptimizer
            },
            {
              name: 'Amazon RDS',
              optimizer: 'rds',
              desc: 'Optimize Amazon RDS Entities',
              cat: 'database',
              icon: 'database',
              cloudIcon: awsIcon,
              link:
                'https://docs.newrelic.com/docs/integrations/amazon-integrations/aws-integrations-list/aws-rds-monitoring-integration',
              linkName: 'Integration Docs'
            }
          ];

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

                  if (o.optimizer === 'rds') {
                    count = entityCountRds;
                  } else if (o.optimizer === 'instance') {
                    count = entityCountHost;
                  } else if (o.optimizer === 'workload') {
                    count = entityCountWorkload;
                  } else {
                    categoryTypes[o.cat].forEach(type => {
                      count += (groupedEntities[type] || []).length;
                    });
                  }

                  return (
                    <Card key={i}>
                      <Card.Content>
                        <Card.Header
                          style={{ cursor: count > 0 ? 'pointer' : '' }}
                          onClick={
                            count > 0
                              ? () => {
                                  if (o.run) {
                                    o.run(`${o.optimizer}-optimizer`);
                                  } else {
                                    updateDataState({
                                      selectedPage: `${o.optimizer}-optimizer`,
                                      selectedWorkload: null
                                    });
                                  }
                                }
                              : undefined
                          }
                        >
                          {o.name}&nbsp;
                          {o.icon ? (
                            <Icon style={{ float: 'right' }} name={o.icon} />
                          ) : (
                            ''
                          )}
                          {o.cloudIcon ? (
                            <>
                              <img
                                src={o.cloudIcon}
                                style={{ float: 'right', height: '25px' }}
                              />
                              &nbsp;&nbsp;
                            </>
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

                        {o.link && o.linkName ? (
                          <span
                            style={{
                              float: 'right'
                            }}
                          >
                            <a
                              href={o.link}
                              rel="noopener noreferrer"
                              target="_blank"
                              style={{
                                color: '#0079BF'
                              }}
                            >
                              {o.linkName}
                            </a>
                          </span>
                        ) : (
                          ''
                        )}
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
