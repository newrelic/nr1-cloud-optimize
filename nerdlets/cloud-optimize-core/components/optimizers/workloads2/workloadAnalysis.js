import React from 'react';
import { WorkloadsConsumer } from './context';
import {
  HeadingText,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  EntityTitleTableRowCell,
  navigation, // View more documentation at https://developer.newrelic.com/components/nrql-query/
  NerdGraphQuery
} from 'nr1';
import {
  adjustCost,
  getTagValue,
  buildGroupByOptions
} from '../../../../shared/lib/utils';
import { timeRangeToNrql } from '../../../../shared/lib/queries';
import { getInstance as getRdsInstance } from '../rds/utils';
import SummaryBar from './summary-bar';
import _ from 'lodash';
import { Divider } from 'semantic-ui-react';

const nrqlQuery = (accountId, query) => `{
  actor {
    account(id: ${accountId}) {
      nrql(query: "${query}") {
        results
      }
    }
  }
}`;

const loadBalancerQuery = (guid, timeRange) =>
  `FROM LoadBalancerSample SELECT latest(awsRegion), latest(provider.estimatedProcessedBytes.Maximum), latest(provider.estimatedAlbActiveConnectionCount.Maximum), latest(provider.estimatedAlbNewConnectionCount.Maximum) WHERE entityGuid = '${guid}' LIMIT 1 ${timeRangeToNrql(
    timeRange
  )}`;

export default class WorkloadAnalysis extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      pricedEntities: null,
      costPeriod: null,
      timeRange: null,
      AWSELB: null,
      costTotals: { data: 0, period: 0, rate: 0 }
    };
  }

  componentDidMount() {
    const { selectedWorkload, costPeriod, timeRange, storeState } = this.props;
    const entities = (selectedWorkload?.relatedEntities?.results || []).map(
      e => e.target.entity
    );

    const groupByOptionsWLCA = buildGroupByOptions(entities);
    storeState({ groupByOptionsWLCA });

    this.setState({ costPeriod, selectedWorkload, timeRange }, async () => {
      await this.fetchCloudPricing();
      this.fetchEntityPricing(selectedWorkload);
    });
  }

  componentDidUpdate() {
    const { selectedWorkload, costPeriod, timeRange } = this.props;

    if (
      JSON.stringify(costPeriod) !== JSON.stringify(this.state.costPeriod) ||
      JSON.stringify(timeRange) !== JSON.stringify(this.state.timeRange)
    ) {
      // eslint-disable-next-line
      this.setState({ costPeriod, timeRange }, () =>
        this.fetchEntityPricing(selectedWorkload)
      );
    }
  }

  fetchCloudPricing = () => {
    // eslint-disable-next-line
    return new Promise(async resolve => {
      const stateUpdate = {};

      // AWSELB
      await fetch(
        'https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/elb/pricing.json'
      )
        .then(response => response.json())
        .then(json => (stateUpdate.AWSELB = json));

      this.setState(stateUpdate, () => resolve());
    });
  };

  fetchEntityPricing = async selectedWorkload => {
    const costTotals = { data: 0, period: 0, rate: 0 };
    const results = selectedWorkload?.relatedEntities?.results || [];
    const entities = results.map(e => e.target.entity);
    const pricingPromises = entities.map(e => this.getCloudPricing(e));
    const pricingData = await Promise.all(pricingPromises);

    pricingData.forEach((cost, i) => {
      if (cost?.dataCost) costTotals.data += parseFloat(cost?.dataCost || 0);
      if (cost?.periodCost)
        costTotals.period += parseFloat(cost?.periodCost || 0);
      if (cost?.rateCost) costTotals.rate += parseFloat(cost?.rateCost || 0);
      entities[i].cost = cost;
    });

    this.setState({ pricedEntities: entities, costTotals });
  };

  getCloudPricing = entity => {
    const { costPeriod, timeRange } = this.state;

    // eslint-disable-next-line
    return new Promise(async resolve => {
      switch (entity.type) {
        case 'AWSELB': {
          const ngData = await NerdGraphQuery.query({
            query: nrqlQuery(
              entity.account.id,
              loadBalancerQuery(entity.guid, timeRange)
            )
          });
          const data = ngData?.data?.actor?.account?.nrql?.results?.[0] || null;
          const pricingData = this.state[entity.type];

          if (data && pricingData) {
            const awsRegion = data['latest.awsRegion'];
            const estimatedProcessedBytes =
              data['latest.provider.estimatedProcessedBytes.Maximum'];
            //   const estimatedAlbActiveConnectionCount =
            //   data['latest.provider.estimatedAlbActiveConnectionCount.Maximum'];
            // const estimatedAlbNewConnectionCount =
            //   data['latest.provider.estimatedAlbNewConnectionCount.Maximum'];
            const pricing = pricingData.regions[pricingData.mapping[awsRegion]];
            const dataRate = parseFloat(
              pricing['Classic Load Balancer Data'].price
            );
            const hourRate = parseFloat(
              pricing['Classic Load Balancer Hours'].price
            );

            // https://aws.amazon.com/elasticloadbalancing/pricing/
            const dataCost = (
              dataRate *
              (estimatedProcessedBytes / 1e9)
            ).toFixed(20);
            const periodCost = adjustCost(costPeriod, hourRate);

            resolve({ dataCost, periodCost });
          }

          resolve(null);
          break;
        }
        case 'AWSRDSDBINSTANCE': {
          const region = getTagValue(entity.tags, 'aws.awsRegion');
          const instanceType = getTagValue(entity.tags, 'aws.dbInstanceClass');
          const engine = getTagValue(entity.tags, 'aws.engine');
          const multiAz = getTagValue(entity.tags, 'aws.multiAz');

          if (region && instanceType && engine) {
            const pricing = await getRdsInstance(
              region,
              instanceType,
              engine,
              multiAz
            );

            if (pricing && pricing[0]) {
              const hourRate = pricing[0].onDemandPrice.pricePerUnit.USD;
              const periodCost = adjustCost(costPeriod, hourRate);
              resolve({ periodCost });
            }
          }

          resolve(null);
          break;
        }
        default:
          resolve(null);
      }
    });
  };

  render() {
    const { height, selectedWorkload, groupBy } = this.props;
    const { pricedEntities, costTotals } = this.state;
    const results = selectedWorkload?.relatedEntities?.results || [];
    const entities = pricedEntities || results.map(e => e.target.entity);

    const menuGroupedEntities = _.groupBy(entities, e => {
      const foundKey = e.tags.find(t => t.key === groupBy.value);
      if (foundKey) {
        return foundKey.values[0] || undefined;
      }
      return undefined;
    });

    console.log(groupBy);

    console.log(menuGroupedEntities);

    return (
      <WorkloadsConsumer>
        {({ completeEntities }) => {
          return (
            <>
              <SummaryBar costTotals={costTotals} />

              {Object.keys(menuGroupedEntities).map(group => {
                return (
                  <>
                    {group || 'Unknown'}

                    <Table
                      items={menuGroupedEntities[group]}
                      style={{ height }}
                    >
                      <TableHeader>
                        <TableHeaderCell>Entity</TableHeaderCell>
                        <TableHeaderCell>Type</TableHeaderCell>
                        <TableHeaderCell>Data Cost (GB)</TableHeaderCell>
                        <TableHeaderCell>Period Cost</TableHeaderCell>
                      </TableHeader>

                      {({ item }) => (
                        <TableRow>
                          <EntityTitleTableRowCell
                            value={item}
                            style={{ cursor: 'pointer' }}
                            onClick={() =>
                              navigation.openStackedEntity(item.guid)
                            }
                          />
                          <TableRowCell>{item.type}</TableRowCell>
                          <TableRowCell>
                            {item?.cost?.dataCost || ''}
                          </TableRowCell>
                          <TableRowCell>
                            {item?.cost?.periodCost || ''}
                          </TableRowCell>
                        </TableRow>
                      )}
                    </Table>
                    <Divider />
                  </>
                );
              })}
            </>
          );
        }}
      </WorkloadsConsumer>
    );
  }
}
