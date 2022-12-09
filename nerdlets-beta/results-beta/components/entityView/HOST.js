import React from 'react';
import HostStandardView from './HOST STANDARD';
import HostECSView from './HOST_ECS';
import HostKubernetesView from './HOST_K8S';

// eslint-disable-next-line no-unused-vars
export default function HostView(props) {
  const { entities, obfuscate } = props;

  const standardHosts = [];
  const k8sHosts = [];
  const ecsHosts = [];

  for (let z = 0; z < entities.length; z++) {
    if (entities[z].K8sContainerData) {
      k8sHosts.push(entities[z]);
    } else if (entities[z].EcsContainerData) {
      ecsHosts.push(entities[z]);
    } else {
      standardHosts.push(entities[z]);
    }
  }

  return (
    <>
      {standardHosts.length > 0 && (
        <HostStandardView entities={standardHosts} obfuscate={obfuscate} />
      )}
      {k8sHosts.length > 0 && (
        <HostKubernetesView entities={k8sHosts} obfuscate={obfuscate} />
      )}
      {ecsHosts.length > 0 && (
        <HostECSView entities={ecsHosts} obfuscate={obfuscate} />
      )}
    </>
  );
}
