import React from 'react';
import { Card, Icon, Button } from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import WorkloadList from './list';
import Candidates from '../instances/candidates';
import InstanceSummary from '../instances/summary';
import { calculateGroupedMetrics } from '../../../../shared/lib/utils';
import InstancePerformanceCard from '../instances/perf-card';

export default class InstanceCards extends React.PureComponent {
  render() {
    let { groups } = this.props;

    return (
      <DataConsumer>
        {({ selectedGroup, updateDataState, selectedWorkload }) => {
          groups = groups.filter(g =>
            selectedGroup ? g.name === selectedGroup : true
          );

          let groupData = null;
          let workload = null;

          return (
            <>
              <Card.Group centered>
                {groups.map((g, i) => {
                  groupData = selectedGroup === g.name ? g : null;

                  if (groupData) {
                    groupData.entities.forEach(group => {
                      group.metrics = calculateGroupedMetrics(
                        group.entityData || [],
                        null,
                        'instances'
                      );
                    });
                  }

                  workload = groupData
                    ? groupData.entities.filter(
                        e => selectedWorkload === e.guid
                      )
                    : null;

                  if (workload && workload.length === 1) {
                    workload = workload[0];
                  }

                  return (
                    <Card
                      key={i}
                      color="blue"
                      style={{ cursor: 'pointer', color: 'black' }}
                      onClick={() =>
                        updateDataState({
                          selectedGroup:
                            g.name === selectedGroup ? null : g.name,
                          selectedWorkload: null
                        })
                      }
                    >
                      <Card.Content>
                        <span
                          style={{
                            fontSize: '13px',
                            float: 'left',
                            paddingTop: '5px'
                          }}
                        >
                          {g.name === 'undefined' ? 'Uncategorized' : g.name}
                        </span>
                        <span style={{ float: 'right' }}>
                          <Button
                            size="mini"
                            compact
                            content={groupData ? 'Hide' : 'Show'}
                            color={groupData ? 'instagram' : 'twitter'}
                          />
                        </span>
                      </Card.Content>
                      <Card.Content>
                        <span style={{ float: 'left', fontSize: '13px' }}>
                          <Icon name="cubes" />
                          &nbsp;
                          {g.metrics.workloads.entityCount} Entities
                        </span>
                        <span style={{ float: 'right', fontSize: '13px' }}>
                          <Icon name="circle" />
                          {g.entities.length}&nbsp;
                          {g.entities.length === 0 ? 'Workload' : 'Workloads'}
                          &nbsp;
                          <Icon name="external" />
                        </span>
                      </Card.Content>
                    </Card>
                  );
                })}
              </Card.Group>

              {selectedGroup && groups.length === 1 && groupData ? (
                <>
                  <WorkloadList groupData={groupData} />

                  {workload && selectedWorkload ? (
                    <>
                      <InstanceSummary groups={[workload]} />

                      <Card.Group centered>
                        <InstancePerformanceCard
                          entities={workload.entityData}
                        />
                      </Card.Group>

                      <Candidates
                        group={{ entities: workload.entityData || [] }}
                      />
                    </>
                  ) : (
                    ''
                  )}
                </>
              ) : (
                ''
              )}
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
