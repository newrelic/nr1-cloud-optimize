import React from 'react';
import { WorkloadsConsumer } from './context';
import {
  Button,
  Table,
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
import { getEc2Instance } from '../aws/ec2/utils';
import { getElasticsearchNodePricing } from '../aws/elasticsearch/utils';
import SummaryBar from './summary-bar';
import _ from 'lodash';
import { Divider } from 'semantic-ui-react';
import CostModal from './costModal';

const nrqlQuery = (accountId, query) => `{
  actor {
    account(id: ${accountId}) {
      nrql(query: "${query}", timeout: 60) {
        results
      }
    }
  }
}`;

const elasticsearchGetClusterQuery = (guid, timeRange) =>
  `SELECT latest(provider.domainName) FROM DatastoreSample WHERE provider='ElasticsearchNode' AND entityGuid = '${guid}' LIMIT 1 ${timeRangeToNrql(
    timeRange
  )}`;

const elasticsearchGetClusterData = (clusterName, timeRange) =>
  `SELECT latest(awsRegion), latest(provider.instanceType)  FROM DatastoreSample WHERE provider='ElasticsearchCluster' WHERE entityName = '${clusterName}' LIMIT 1 ${timeRangeToNrql(
    timeRange
  )}`;

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

const lambdaSampleQuery = (guid, timeRange) =>
  `SELECT average(provider.duration.Maximum), sum(provider.invocations.Sum), latest(provider.memorySize) FROM ServerlessSample WHERE entityGuid = '${guid}' LIMIT 1 ${timeRangeToNrql(
    timeRange
  )}`;

const awsApiGatewayQuery = (guid, timeRange) =>
  `SELECT sum(provider.count.SampleCount) as 'requests' FROM ApiGatewaySample WHERE provider='ApiGatewayApi' WHERE entityGuid = '${guid}' LIMIT 1 ${timeRangeToNrql(
    timeRange
  )}`;

const elasticacheGetNodeType = (clusterId, timeRange) =>
  `SELECT latest(provider.cacheNodeType) as 'nodeType' FROM DatastoreSample WHERE provider='ElastiCacheRedisCluster' AND provider.cacheClusterId = '${clusterId}' LIMIT 1 ${timeRangeToNrql(
    timeRange
  )}`;

const getK8sContainerCount = (hostname, timeRange) =>
  `FROM K8sContainerSample SELECT uniqueCount(containerID) as 'containerCount' WHERE hostname = '${hostname}' LIMIT 1 ${timeRangeToNrql(
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
      AWSLAMBDAFUNCTION: null,
      AWSELASTICSEARCHNODE: null,
      AWSAPIGATEWAYAPI: null,
      AWSELASTICACHEREDISNODE: null,
      costTotals: { data: 0, period: 0, rate: 0 },
      costModalHidden: true,
      costMessages: [],
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

      // AWSELASTICACHEREDISNODE
      await fetch(
        'https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/elasticache/pricing.json'
      )
        .then(response => response.json())
        .then(json => (stateUpdate.AWSELASTICACHEREDISNODE = json));

      // AWSELASTICSEARCHNODE
      await fetch(
        'https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/elasticsearch/pricing.json'
      )
        .then(response => response.json())
        .then(json => (stateUpdate.AWSELASTICSEARCHNODE = json));

      // AWSAPIGATEWAYAPI
      await fetch(
        'https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/apigateway/pricing.json'
      )
        .then(response => response.json())
        .then(json => (stateUpdate.AWSAPIGATEWAYAPI = json));

      // AWSLAMBDAFUNCTION
      await fetch(
        'https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/lambda/pricing.json'
      )
        .then(response => response.json())
        .then(json => (stateUpdate.AWSLAMBDAFUNCTION = json));

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
        case 'AWSELASTICACHEREDISNODE': {
          const awsRegion = getTagValue(entity.tags, 'aws.awsRegion');
          const cacheClusterId = getTagValue(entity.tags, 'aws.cacheClusterId');

          if (awsRegion && cacheClusterId) {
            const ngData = await NerdGraphQuery.query({
              query: nrqlQuery(
                entity.account.id,
                elasticacheGetNodeType(cacheClusterId, timeRange)
              )
            });

            const data =
              ngData?.data?.actor?.account?.nrql?.results?.[0] || null;
            const pricingData = this.state[entity.type];

            if (data && pricingData) {
              const regionPricing =
                pricingData.regions[pricingData.mapping[awsRegion]] || {};

              const prices = [];

              Object.keys(regionPricing).forEach(instance => {
                const price = regionPricing[instance];

                if (price['Instance Type'] === data.nodeType) {
                  prices.push(price);
                }
              });

              if (prices.length > 0) {
                const hourRate = prices[0].price;
                const periodCost = adjustCost(costPeriod, hourRate);

                const messages = [
                  `Type: ${data.name}`,
                  `Region: ${awsRegion}`,
                  `Cost Period: ${costPeriod.label}`,
                  `Hourly Rate: ${hourRate}`,
                  `Total Cost: ${periodCost}`,
                  `Total cost based on the entire cost period using the hourly rate.`
                ];

                resolve({ periodCost, totalCost: periodCost, messages });
              }
            }
          }

          resolve(null);
          break;
        }
        case 'AWSAPIGATEWAYAPI': {
          const ngData = await NerdGraphQuery.query({
            query: nrqlQuery(
              entity.account.id,
              awsApiGatewayQuery(entity.guid, timeRange)
            )
          });

          const data = ngData?.data?.actor?.account?.nrql?.results?.[0] || null;
          const pricingData = this.state[entity.type];

          if (data && pricingData) {
            //

            const awsRegion = getTagValue(entity.tags, 'aws.awsRegion');
            const requests = data.requests || 0;
            const apiCallPrice =
              pricingData.regions[pricingData.mapping[awsRegion]]?.[
                'API Calls Number of up to 333 million'
              ]?.price;

            if (apiCallPrice) {
              const requestCost = apiCallPrice * requests;

              const adjustedCost = adjustCost(
                costPeriod,
                parseFloat(requestCost)
              );

              const messages = [
                `Region: ${awsRegion}`,
                `Requests: ${requests}`,
                `API Call Price: ${apiCallPrice}`,
                `Cost Period: ${costPeriod.label}`,
                `Total Cost (Call Price x Requests): ${adjustedCost}`,
                `https://aws.amazon.com/api-gateway/pricing/`
              ];

              resolve({ totalCost: adjustedCost, messages });
            }
          }

          resolve(null);
          break;
        }
        case 'AWSELASTICSEARCHNODE': {
          const ngClusterName = await NerdGraphQuery.query({
            query: nrqlQuery(
              entity.account.id,
              elasticsearchGetClusterQuery(entity.guid, timeRange)
            )
          });

          const clusterName =
            ngClusterName?.data?.actor?.account?.nrql?.results?.[0]?.[
              'latest.provider.domainName'
            ] || null;

          if (clusterName) {
            const ngClusterData = await NerdGraphQuery.query({
              query: nrqlQuery(
                entity.account.id,
                elasticsearchGetClusterData(clusterName, timeRange)
              )
            });

            const pricingData = this.state[entity.type];
            const nodePricing = getElasticsearchNodePricing(
              ngClusterData,
              pricingData,
              adjustCost,
              costPeriod
            );

            resolve(nodePricing);
          } else {
            resolve(null);
          }

          break;
        }
        case 'AWSLAMBDAFUNCTION': {
          const ngData = await NerdGraphQuery.query({
            query: nrqlQuery(
              entity.account.id,
              lambdaSampleQuery(entity.guid, timeRange)
            )
          });
          const data = ngData?.data?.actor?.account?.nrql?.results?.[0] || null;
          const pricingData = this.state[entity.type];

          if (data && pricingData) {
            const awsRegion = getTagValue(entity.tags, 'aws.awsRegion');
            const invocations = data['sum.provider.invocations.Sum'];
            const averageDurationMs = data['average.provider.duration.Maximum'];

            const pricing = pricingData.regions[pricingData.mapping[awsRegion]];
            const lambdaDurationCost = pricing?.['Lambda Duration'].price;
            const lambdRequestCost = pricing?.['Lambda Requests'].price;

            if (invocations && averageDurationMs) {
              const durationCost = averageDurationMs * lambdaDurationCost;
              const requestCost = invocations * lambdRequestCost;

              const adjustedCost = adjustCost(
                costPeriod,
                parseFloat(durationCost + requestCost)
              );

              const messages = [
                `Region: ${awsRegion}`,
                `Invocations: ${invocations}`,
                `Average duration (ms): ${averageDurationMs}`,
                `Duration Cost: ${lambdaDurationCost}`,
                `Request Cost: ${lambdRequestCost}`,
                `Cost Period: ${costPeriod.label}`,
                `Total Cost (Duration + Request Cost for the defined cost period): ${adjustedCost}`
              ];

              resolve({ totalCost: adjustedCost, messages });
            } else {
              resolve({ totalCost: 0 });
            }
          }

          resolve(null);

          break;
        }
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

            const messageCostStandard = parseFloat(
              pricing['Standard per Requests'].price
            );

            if (pricing) {
              const messageRate = adjustCost(
                costPeriod,
                messageCostStandard * messages
              );

              const costMessages = [
                `Region: ${awsRegion}`,
                `Message Count: ${messages}`,
                `Message Cost (Standard per requests): ${messageCostStandard}`,
                `Cost Period: ${costPeriod.label}`,
                `Total Cost (Message Count x Message Cost): ${messageRate}`
              ];

              resolve({
                rateCost: messageRate,
                totalCost: messageRate,
                messages: costMessages
              });
            }
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
            const lcuPricingCost = parseFloat(
              pricing['Application Load Balancer LCU Hours'].price
            );
            const lcuRate =
              lcuPricingCost *
              (newConnLCUs + activeConnLCUs + processedGbLCUs + rulesEvalLCUs);
            const hourRate = parseFloat(
              pricing['Application Load Balancer Hours'].price
            );

            // https://aws.amazon.com/elasticloadbalancing/pricing/

            const periodCost = adjustCost(costPeriod, hourRate);
            const lcuCost = adjustCost(costPeriod, lcuRate);
            const totalCost = periodCost + lcuCost;

            const messages = [
              `This calculation uses LCUs to determine cost, it is based on several factors as listed below.`,
              `See https://aws.amazon.com/elasticloadbalancing/pricing/ for more detail.`,
              `New Connections: ${data['latest.provider.newConnectionCount.Sum']}`,
              `Active Connections: ${data[
                'latest.provider.activeConnectionCount.Sum'
              ] || 0}`,
              `Rules: ${data['latest.provider.ruleEvaluations.Sum']}`,
              `Cost per LCU: ${lcuPricingCost}`,
              `Hourly Rate: ${hourRate}`,
              `LCU Cost (Cost per LCU x LCUs): ${lcuCost}`,
              `Cost Period: ${costPeriod.label}`,
              `Total Period Cost: ${periodCost}`,
              `Total Cost (LCU Cost + Total Period Cost): ${periodCost +
                lcuCost}`
            ];

            resolve({ periodCost: periodCost + lcuCost, totalCost, messages });
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

            const messages = [
              `Region: ${awsRegion}`,
              `Estimated Processed Bytes: ${estimatedProcessedBytes}`,
              `Data Rate /GB: ${dataRate}`,
              `Hourly Rate: ${hourRate}`,
              `Cost Period: ${costPeriod.label}`,
              `Data Cost (Data Rate x ProcessedBytes): ${dataCost}`,
              `Total Period Cost: ${periodCost}`,
              `Total Cost (Data Cost + Total Period Cost): ${periodCost +
                dataCost}`
            ];

            resolve({
              dataCost,
              periodCost,
              totalCost: periodCost + dataCost,
              messages
            });
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

              const messages = [
                `Type: ${instanceType}`,
                `Engine: ${engine}`,
                `MultiAZ: ${multiAz}`,
                `Region: ${region}`,
                `Cost Period: ${costPeriod.label}`,
                `Hourly Rate: ${hourRate}`,
                `Total Cost: ${periodCost}`,
                `Total cost based on the entire cost period using the hourly rate.`
              ];

              resolve({ periodCost, totalCost: periodCost, messages });
            }
          }

          resolve({ error: 'Pricing unavailable' });
          break;
        }
        case 'HOST': {
          const hostname = getTagValue(entity.tags, 'hostname');

          const ngData = await NerdGraphQuery.query({
            query: nrqlQuery(
              entity.account.id,
              getK8sContainerCount(hostname, timeRange)
            )
          });
          const k8sContainerCount =
            ngData?.data?.actor?.account?.nrql?.results?.[0]?.containerCount ||
            0;

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

              const messages = [
                `Type: ${instanceType}`,
                `Region: ${region}`,
                `Cost Period: ${costPeriod.label}`,
                `Hourly Rate: ${hourRate}`,
                `Total Cost: ${periodCost}`,
                `Total cost based on the entire cost period using the hourly rate.`
              ];

              resolve({
                periodCost,
                totalCost: periodCost,
                messages,
                k8sContainerCount
              });
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
      costModalHidden,
      pricedEntities,
      costTotals,
      fetchingPricing,
      sortColumn,
      sortDirection,
      costMessages
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
              <CostModal
                hidden={costModalHidden}
                messages={costMessages}
                onClose={() => this.setState({ costModalHidden: true })}
              />
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
                        <TableHeaderCell />
                      </TableHeader>

                      {({ item }) => {
                        const totalCost = item?.cost?.totalCost || '';
                        const messages = item?.cost?.messages || [];
                        const k8sContainerCount =
                          item?.cost?.k8sContainerCount || null;
                        const hostname = getTagValue(item.tags, 'hostname');
                        const systemMemoryBytes = getTagValue(
                          item.tags,
                          'systemMemoryBytes'
                        );
                        const coreCount = getTagValue(item.tags, 'coreCount');

                        const nerdlet = {
                          id: 'k8s-container-optimize',
                          urlState: {
                            guid: item.guid,
                            account: item.account,
                            name: item.name,
                            k8sContainerCount,
                            cost: item.cost,
                            hostname,
                            coreCount,
                            systemMemoryBytes
                          }
                        };

                        return (
                          <TableRow>
                            <EntityTitleTableRowCell
                              value={item}
                              style={{ cursor: 'pointer' }}
                              onClick={() =>
                                navigation.openStackedEntity(item.guid)
                              }
                            />
                            <TableRowCell>{item.type}</TableRowCell>
                            <TableRowCell
                              onClick={
                                messages.length > 0
                                  ? () =>
                                      this.setState({
                                        costModalHidden: false,
                                        costMessages: messages
                                      })
                                  : undefined
                              }
                            >
                              {totalCost}
                            </TableRowCell>
                            <TableRowCell>
                              {k8sContainerCount && (
                                <Button
                                  onClick={() =>
                                    navigation.openStackedNerdlet(nerdlet)
                                  }
                                  type={Button.TYPE.PRIMARY}
                                  sizeType={Button.SIZE_TYPE.SMALL}
                                  iconType={
                                    Button.ICON_TYPE
                                      .INTERFACE__VIEW__HIGH_DENSITY_VIEW
                                  }
                                >
                                  {k8sContainerCount} Kubernetes Containers
                                </Button>
                              )}
                            </TableRowCell>
                          </TableRow>
                        );
                      }}
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