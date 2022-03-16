import React from 'react';
import HostView from './host';

// eslint-disable-next-line no-unused-vars
export default function EntityView(props) {
  const { entities, group } = props;

  const renderView = (group, entities) => {
    switch (group) {
      case 'INFRASTRUCTURE_HOST_ENTITY':
        return <HostView entities={entities} />;
      default:
        return 'No view available for this entity type';
    }
  };

  return <>{renderView(group, entities)}</>;
}
