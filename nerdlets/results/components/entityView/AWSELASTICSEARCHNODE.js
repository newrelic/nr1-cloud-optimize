import React from 'react';
import { generateFakeName } from '../../../shared/utils';
import _ from 'lodash';
import { Card, CardHeader, CardBody } from 'nr1';
import AwsElasticsearchNodeViewStandard from './AWSELASTICSEARCHNODE_STANDARD';

// eslint-disable-next-line no-unused-vars
export default function AwsElasticsearchNodeView(props) {
  const { entities, obfuscate } = props;
  const groupedEntities = _.groupBy(entities, e => e?.clusterName);

  return (
    <Card collapsible style={{ marginLeft: '0px' }}>
      <CardHeader
        style={{ marginLeft: '0px', width: '80%' }}
        title="AWS ELASTICSEARCH CLUSTERS"
        additionalInfoLink={{
          label: `Pricing`,
          to: 'https://aws.amazon.com/opensearch-service/pricing/'
        }}
      />
      <CardBody>
        {Object.keys(groupedEntities).map(groupKey => {
          const groupName = obfuscate ? generateFakeName() : groupKey;

          return (
            <AwsElasticsearchNodeViewStandard
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
