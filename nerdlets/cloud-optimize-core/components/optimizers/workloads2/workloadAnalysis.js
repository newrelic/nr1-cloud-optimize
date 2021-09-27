import React from 'react';
import { WorkloadsConsumer } from './context';
import {
  Button,
  Table,
  Spinner,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  EntityTitleTableRowCell,
  navigation,
  NerdGraphQuery
} from 'nr1';
import {
  adjustCost,
  getTagValue,
  buildGroupByOptions
} from '../../../../shared/lib/utils';
import { timeRangeToNrql } from '../../../../shared/lib/queries';
import { getInstance as getRdsInstance } from '../rds/utils';
import { getEc2Instance } from '../ec2/utils';
import SummaryBar from './summary-bar';
import _ from 'lodash';
import { Divider } from 'semantic-ui-react';

const nrqlQuery = (accountId, query) => `{
  actor {
    account(id: ${accountId}) {
      nrql(query: "${query}", timeout: 60) {
        results
      }
    }
  }
}`;

const loadBalancerQuery = (guid, timeRange) =>
  `FROM LoadBalancerSample SELECT latest(awsRegion), latest(provider.ruleEvaluations.Sum), latest(provider.estimatedProcessedBytes.Maximum), latest(provider.estimatedAlbActiveConnectionCount.Maximum), latest(provider.estimatedAlbNewConnectionCount.Maximum) WHERE entityGuid = '${guid}' LIMIT 1 ${timeRangeToNrql(
    timeRange
  )}`;

const applicationLoadBalancerQuery = (guid, timeRange) =>
  `FROM LoadBalancerSample SELECT latest(awsRegion), latest(provider.ruleEvaluations.Sum), latest(provider.processedBytes.Maximum), latest(provider.newConnectionCount.Sum), latest(procider.activeConnectionCount.Sum) WHERE entityGuid = '${guid}' LIMIT 1 ${timeRangeToNrql(
    timeRange
  )}`;

const queueSampleQuery = (guid, timeRange) =>
  `FROM QueueSample SELECT latest(awsRegion), latest(provider.numberOfMessagesSent.Sum + provider.numberOfMessagesReceived.Sum + provider.numberOfMessagesDeleted.Sum) as 'numberOfMessages' WHERE entityGuid = '${guid}' AND dataSourceName = 'SQS' LIMIT 1 ${timeRangeToNrql(
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
      AWSSQSQUEUE: null,
      costTotals: { data: 0, period: 0, rate: 0 },
      fetchingPricing: false,
      sortColumn: 2,
      sortDirection: TableHeaderCell.SORTING_TYPE.DESCENDING
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

  onClickTableHeaderCell = (column, { nextSortingType }) => {
    if (column === this.state.sortColumn) {
      this.setState({ sortDirection: nextSortingType });
    } else {
      this.setState({ sortColumn: column, sortDirection: nextSortingType });
    }
  };

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

      // AWSSQSQUEUE
      await fetch(
        'https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/sqs/pricing.json'
      )
        .then(response => response.json())
        .then(json => (stateUpdate.AWSSQSQUEUE = json));

      this.setState(stateUpdate, () => resolve());
    });
  };

  fetchEntityPricing = selectedWorkload => {
    this.setState({ fetchingPricing: true }, async () => {
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

      console.log(entities);

      this.setState({
        pricedEntities: entities,
        costTotals,
        fetchingPricing: false
      });
    });
  };

  getCloudPricing = entity => {
    const { costPeriod, timeRange } = this.state;

    // eslint-disable-next-line
    return new Promise(async resolve => {
      switch (entity.type) {
        case 'AWSSQSQUEUE': {
          const ngData = await NerdGraphQuery.query({
            query: nrqlQuery(
              entity.account.id,
              queueSampleQuery(entity.guid, timeRange)
            )
          });
          const data = ngData?.data?.actor?.account?.nrql?.results?.[0] || null;
          const pricingData = this.state[entity.type];

          if (data && pricingData) {
            const awsRegion = data['latest.awsRegion'];
            const messages = data.numberOfMessages || 0;

            const pricing = pricingData.regions[pricingData.mapping[awsRegion]];

            const messageRate = adjustCost(
              costPeriod,
              parseFloat(pricing['Standard per Requests'].price) * messages
            );

            resolve({ rateCost: messageRate, totalCost: messageRate });
          }
          resolve(null);

          break;
        }
        case 'AWSALB': {
          const ngData = await NerdGraphQuery.query({
            query: nrqlQuery(
              entity.account.id,
              applicationLoadBalancerQuery(entity.guid, timeRange)
            )
          });
          const data = ngData?.data?.actor?.account?.nrql?.results?.[0] || null;
          const pricingData = this.state.AWSELB;

          if (data && pricingData) {
            const awsRegion = data['latest.awsRegion'];

            // LCU Cost
            // You are charged only on the dimension with the highest usage. An LCU contains:
            // 25 new connections per second.
            // 3,000 active connections per minute.
            // 1 GB per hour for EC2 instances, containers and IP addresses as targets and 0.4 GB per hour for Lambda functions as targets

            // work on 1 connection per second
            const newConnLCUs = data['latest.provider.newConnectionCount.Sum']
              ? 1 / data['latest.provider.newConnectionCount.Sum']
              : 0;

            // work on 1 new connection per second, each lasting 2 minutes
            const activeConnLCUs = data[
              'latest.provider.activeConnectionCount.Sum'
            ]
              ? 120 / data['latest.provider.activeConnectionCount.Sum']
              : 0;

            const processedGbLCUs = data['latest.provider.processedBytes.Sum']
              ? data['latest.provider.processedBytes.Sum'] / 1e9 / 1
              : 0;

            // Rule Evaluations (per second): For simplicity, assume that all configured rules are processed for a request.
            // Each LCU provides 1,000 rule evaluations per second (averaged over the hour).
            // Since your application receives 5 requests/sec, 60 processed rules for each request results
            // in a maximum 250 rule evaluations per second (60 processed rules – 10 free rules) * 5 or 0.25 LCU (250 rule evaluations per second / 1,000 rule evaluations per second)
            const rulesSum = data['latest.provider.ruleEvaluations.Sum'];
            const rulesEvalLCUs = rulesSum > 10 ? (rulesSum - 10) * 5 : 0;

            const pricing = pricingData.regions[pricingData.mapping[awsRegion]];
            const lcuRate =
              parseFloat(pricing['Application Load Balancer LCU Hours'].price) *
              (newConnLCUs + activeConnLCUs + processedGbLCUs + rulesEvalLCUs);
            const hourRate = parseFloat(
              pricing['Application Load Balancer Hours'].price
            );

            // https://aws.amazon.com/elasticloadbalancing/pricing/

            const periodCost = adjustCost(costPeriod, hourRate);
            const lcuCost = adjustCost(costPeriod, lcuRate);
            const totalCost = periodCost + lcuCost;

            resolve({ periodCost: periodCost + lcuCost, totalCost });
          }

          resolve({ error: 'Pricing unavailable' });

          break;
        }
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

            resolve({ dataCost, periodCost, totalCost: periodCost + dataCost });
          }

          resolve({ error: 'Pricing unavailable' });
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
              resolve({ periodCost, totalCost: periodCost });
            }
          }

          resolve({ error: 'Pricing unavailable' });
          break;
        }
        case 'HOST': {
          const region = getTagValue(entity.tags, 'aws.awsRegion');
          const awsEc2InstanceType = getTagValue(
            entity.tags,
            'aws.ec2InstanceType'
          );
          const defaultInstanceType = getTagValue(entity.tags, 'instanceType');
          const instanceType =
            awsEc2InstanceType || defaultInstanceType || null;

          if (region && instanceType) {
            const pricing = await getEc2Instance(region, instanceType);

            if (pricing && pricing[0]) {
              const hourRate = pricing[0].onDemandPrice;
              const periodCost = adjustCost(costPeriod, hourRate);
              resolve({ periodCost, totalCost: periodCost });
            }
          } else {
            resolve({ error: 'Pricing unavailable' });
          }

          break;
        }
        default:
          resolve({ error: 'Pricing for this service is not supported yet' });
      }
    });
  };

  render() {
    const { height, selectedWorkload, groupBy } = this.props;
    const {
      pricedEntities,
      costTotals,
      fetchingPricing,
      sortColumn,
      sortDirection
    } = this.state;
    const results = selectedWorkload?.relatedEntities?.results || [];
    const entities = pricedEntities || results.map(e => e.target.entity);

    const menuGroupedEntities = _.groupBy(entities, e => {
      const foundKey = (e?.tags || []).find(t => t?.key === groupBy?.value);
      if (foundKey) {
        return foundKey.values[0] || undefined;
      }
      return undefined;
    });

    return (
      <WorkloadsConsumer>
        {({ completeEntities }) => {
          return (
            <>
              <SummaryBar
                costTotals={costTotals}
                fetchingPricing={fetchingPricing}
              />

              {Object.keys(menuGroupedEntities).map(group => {
                let groupCost = 0;
                menuGroupedEntities[group].forEach(e => {
                  groupCost += e?.cost?.totalCost || 0;
                });
                return (
                  <>
                    {group || 'Unknown'} &nbsp;
                    <Button
                      style={{ cursor: 'text' }}
                      type={Button.TYPE.OUTLINE}
                      sizeType={Button.SIZE_TYPE.SMALL}
                    >
                      Total: ${groupCost}
                    </Button>
                    <Table
                      items={menuGroupedEntities[group]}
                      style={{ height }}
                    >
                      <TableHeader>
                        <TableHeaderCell
                          value={({ item }) => item.name}
                          sortable
                          sortingType={
                            sortColumn === 0
                              ? sortDirection
                              : TableHeaderCell.SORTING_TYPE.NONE
                          }
                          onClick={(event, data) =>
                            this.onClickTableHeaderCell(0, data)
                          }
                        >
                          Entity
                        </TableHeaderCell>
                        <TableHeaderCell
                          value={({ item }) => item.typw}
                          sortable
                          sortingType={
                            sortColumn === 1
                              ? sortDirection
                              : TableHeaderCell.SORTING_TYPE.NONE
                          }
                          onClick={(event, data) =>
                            this.onClickTableHeaderCell(1, data)
                          }
                        >
                          Type
                        </TableHeaderCell>
                        <TableHeaderCell
                          value={({ item }) => item?.cost?.totalCost || ''}
                          sortable
                          sortingType={
                            sortColumn === 2
                              ? sortDirection
                              : TableHeaderCell.SORTING_TYPE.NONE
                          }
                          onClick={(event, data) =>
                            this.onClickTableHeaderCell(2, data)
                          }
                        >
                          Estimated Cost
                        </TableHeaderCell>
                        {/* <TableHeaderCell>Data Cost (GB)</TableHeaderCell>
                        <TableHeaderCell>Rate Cost</TableHeaderCell>
                        <TableHeaderCell>Period Cost</TableHeaderCell> */}
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
                            {item?.cost?.totalCost || ''}
                          </TableRowCell>
                          {/* 
                          <TableRowCell>
                            {item?.cost?.dataCost || ''}
                          </TableRowCell>
                          <TableRowCell>
                            {item?.cost?.rateCost || ''}
                          </TableRowCell>
                          <TableRowCell>
                            {item?.cost?.periodCost || ''}
                          </TableRowCell> */}
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
