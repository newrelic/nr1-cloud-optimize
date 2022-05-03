import React from 'react';
import AwsAlbView from './AWSALB';
import AwsAPIGatewayView from './AWSAPIGATEWAYAPI';
import AwsElasticacheRedisNodeView from './AWSELASTICACHEREDISNODE';
import AwsElasticsearchNodeView from './AWSELASTICSEARCHNODE';
import AwsElbView from './AWSELB';
import AwsLambdaFunctionView from './AWSLAMBDAFUNCTION';
import AwsRdsDbInstanceView from './AWSRDSDBINSTANCE';
import AwsSqsView from './AWSSQSQUEUE';
import HostView from './HOST';

// const ignore = ['AWSELASTICSEARCHCLUSTER'];

// eslint-disable-next-line no-unused-vars
export default function EntityView(props) {
  const { entities, group, obfuscate } = props;

  const renderView = (group, entities) => {
    switch (group) {
      case 'HOST':
        return <HostView entities={entities} obfuscate={obfuscate} />;
      case 'AWSAPIGATEWAYAPI':
        return <AwsAPIGatewayView entities={entities} />;
      case 'AWSELASTICSEARCHNODE':
        return (
          <AwsElasticsearchNodeView entities={entities} obfuscate={obfuscate} />
        );
      case 'AWSELASTICACHEREDISNODE':
        return (
          <AwsElasticacheRedisNodeView
            entities={entities}
            obfuscate={obfuscate}
          />
        );
      case 'AWSELB':
        return <AwsElbView entities={entities} />;
      case 'AWSALB':
        return <AwsAlbView entities={entities} />;
      case 'AWSSQSQUEUE':
        return <AwsSqsView entities={entities} />;
      case 'AWSLAMBDAFUNCTION':
        return <AwsLambdaFunctionView entities={entities} />;
      case 'AWSRDSDBINSTANCE':
        return <AwsRdsDbInstanceView entities={entities} />;
      default:
        // console.log(`unsupported entityType: ${group}`);
        return '';
      // return ignore.includes(group) ? (
      //   ''
      // ) : (
      //   <>
      //     No view available for {group}
      //     <br />
      //   </>
      // );
    }
  };

  return <>{renderView(group, entities)}</>;
}
