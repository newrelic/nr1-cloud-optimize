import React from 'react';
import { generateFakeName } from '../../../shared/utils';
import _ from 'lodash';
import { Card, CardHeader, CardBody } from 'nr1';
import HostKubernetesViewStandard from './HOST_K8S_STANDARD';

// eslint-disable-next-line no-unused-vars
export default function HostKubernetesView(props) {
  const { entities, obfuscate, entityTableMode, updateDataState } = props;
  const groupedEntities = _.groupBy(entities, e => e?.clusterName);

  return (
    <Card collapsible style={{ marginLeft: '0px' }}>
      <CardHeader
        style={{ marginLeft: '0px', width: '80%' }}
        title={`KUBERNETES CLUSTERS (${Object.keys(groupedEntities).length})`}
      />
      <CardBody>
        {Object.keys(groupedEntities).map(groupKey => {
          let groupName = obfuscate
            ? generateFakeName()
            : groupKey || 'Unknown';
          groupName = groupName === 'undefined' ? 'Unknown' : groupName;

          return (
            <HostKubernetesViewStandard
              key={groupKey}
              groupTitle={`CLUSTER: ${groupName}`}
              groupName={groupName}
              obfuscate={obfuscate}
              entities={groupedEntities[groupKey]}
              entityTableMode={entityTableMode}
              updateDataState={updateDataState}
            />
          );
        })}
      </CardBody>
    </Card>
  );
}
