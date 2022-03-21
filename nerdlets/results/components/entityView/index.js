import React from 'react';
import AwsAlbView from './AWSALB';
import AwsAPIGatewayView from './AWSAPIGATEWAYAPI';
import AwsElasticsearchNodeView from './AWSELASTICSEARCHNODE';
import AwsElbView from './AWSELB';
import AwsSqsView from './AWSSQSQUEUE';
import HostView from './HOST';

const ignore = ['AWSELASTICSEARCHCLUSTER'];

// eslint-disable-next-line no-unused-vars
export default function EntityView(props) {
  const { entities, group } = props;

  const renderView = (group, entities) => {
    switch (group) {
      case 'HOST':
        return <HostView entities={entities} />;
      case 'AWSAPIGATEWAYAPI':
        return <AwsAPIGatewayView entities={entities} />;
      case 'AWSELASTICSEARCHNODE':
        return <AwsElasticsearchNodeView entities={entities} />;
      case 'AWSELB':
        return <AwsElbView entities={entities} />;
      case 'AWSALB':
        return <AwsAlbView entities={entities} />;
      case 'AWSSQSQUEUE':
        return <AwsSqsView entities={entities} />;
      default:
        return ignore.includes(group) ? (
          ''
        ) : (
          <>
            No view available for {group}
            <br />
          </>
        );
    }
  };

  return <>{renderView(group, entities)}</>;
}
