import React from 'react';
import AwsElasticacheRedisNodeViewStandard from './AWSELASTICACHEREDISNODE_STANDARD';
import { Card, CardHeader, CardBody } from 'nr1';
import { generateFakeName } from '../../../shared/utils';
import _ from 'lodash';

// eslint-disable-next-line no-unused-vars
export default function AwsElasticacheRedisNodeView(props) {
  const { entities, obfuscate } = props;
  const groupedEntities = _.groupBy(entities, e => e?.cacheClusterId);

  return (
    <Card collapsible style={{ marginLeft: '0px' }}>
      <CardHeader
        style={{ marginLeft: '0px', width: '80%' }}
        title="AWS ELASTICACHE CLUSTERS"
        additionalInfoLink={{
          label: `Pricing`,
          to: 'https://aws.amazon.com/elasticache/pricing/'
        }}
      />
      <CardBody>
        {Object.keys(groupedEntities).map(groupKey => {
          let groupName = obfuscate ? generateFakeName() : groupKey;
          groupName = groupName === 'undefined' ? 'Unknown' : groupName;

          return (
            <AwsElasticacheRedisNodeViewStandard
              key={groupKey}
              groupTitle={`CLUSTER: ${groupName}`}
              groupName={groupName}
              entities={groupedEntities[groupKey]}
            />
          );
        })}
      </CardBody>
    </Card>
  );
}
