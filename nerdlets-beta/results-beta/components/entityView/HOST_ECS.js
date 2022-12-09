import React from 'react';
import { generateFakeName } from '../../../shared/utils';
import _ from 'lodash';
import { Card, CardHeader, CardBody } from 'nr1';
import HostEcsViewStandard from './HOST_ECS_STANDARD';

// eslint-disable-next-line no-unused-vars
export default function HostECSView(props) {
  const { entities, obfuscate } = props;
  const groupedEntities = _.groupBy(entities, e => e?.ecsCluster);

  return (
    <Card collapsible style={{ marginLeft: '0px' }}>
      <CardHeader
        style={{ marginLeft: '0px', width: '80%' }}
        title={`ECS CLUSTERS (${Object.keys(groupedEntities).length})`}
      />
      <CardBody>
        {Object.keys(groupedEntities).map(groupKey => {
          let groupName = obfuscate
            ? generateFakeName()
            : groupKey || 'Unknown';
          groupName = groupName === 'undefined' ? 'Unknown' : groupName;

          return (
            <HostEcsViewStandard
              key={groupKey}
              groupTitle={`CLUSTER: ${groupName}`}
              groupName={groupName}
              obfuscate={obfuscate}
              entities={groupedEntities[groupKey]}
            />
          );
        })}
      </CardBody>
    </Card>
  );
}
