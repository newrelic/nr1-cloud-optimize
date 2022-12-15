import provideSuggestions from './provideSuggestions';

// calculate cost aggregate data and savings
export default function(workloadData, tags, config) {
  const cost = {
    known: 0,
    estimated: 0,
    optimized: 0,
    optimizedRun: 0,
    potentialSaving: 0,
    workloads: {}
  };

  Object.keys(workloadData).forEach(key => {
    // initalize workload summary
    if (!cost.workloads[key]) {
      cost.workloads[key] = {
        known: 0,
        estimated: 0,
        optimized: 0,
        optimizedRun: 0,
        potentialSaving: 0
      };
    }

    (workloadData[key]?.results || []).forEach(e => {
      if (config) {
        provideSuggestions(e, config);
      }
      if (checkTags(e, tags)) {
        if (e.type === 'HOST') {
          if (e.spot) {
            const spotPrice = e?.matches?.exact?.[0]?.spotPrice?.[0]?.price;
            if (spotPrice) {
              cost.known = cost.known + spotPrice;
              cost.workloads[key].known = cost.workloads[key].known + spotPrice;
            }

            const optimizedSpotPrice =
              e?.matches?.optimized?.[0]?.spotPrice?.[0]?.price;
            if (optimizedSpotPrice) {
              cost.optimized = cost.optimized + optimizedSpotPrice;
              cost.potentialSaving = spotPrice - optimizedSpotPrice;

              cost.workloads[key].optimized =
                cost.workloads[key].optimized + optimizedSpotPrice;
              cost.workloads[key].potentialSaving =
                spotPrice - optimizedSpotPrice;
            }

            if (spotPrice || optimizedSpotPrice) {
              if (optimizedSpotPrice) {
                cost.optimizedRun = cost.optimizedRun + optimizedSpotPrice;

                cost.workloads[key].optimizedRun =
                  cost.workloads[key].optimizedRun + optimizedSpotPrice;
              } else {
                cost.optimizedRun = cost.optimizedRun + spotPrice;

                cost.workloads[key].optimizedRun =
                  cost.workloads[key].optimizedRun + spotPrice;
              }
            }
          } else {
            if (e.exactPeriodCost) {
              cost.known = cost.known + e.exactPeriodCost;
              cost.workloads[key].known =
                cost.workloads[key].known + e.exactPeriodCost;
            }

            // not used for anything atm
            // const estimatedPrice =
            //   e?.matches?.estimated?.[0]?.e.exactPeriodCost;
            // if (estimatedPrice) {
            //   cost.estimated = cost.estimated + estimatedPrice;
            //   cost.workloads[key].estimated =
            //     cost.workloads[key].estimated + estimatedPrice;
            // }

            if (e.optimizedPeriodCost) {
              cost.optimized = cost.optimized + e.optimizedPeriodCost;
              cost.workloads[key].optimized =
                cost.workloads[key].optimized + e.optimizedPeriodCost;

              e.potentialSaving = e.exactPeriodCost - e.optimizedPeriodCost;
              cost.potentialSaving = cost.potentialSaving + e.potentialSaving;
              cost.workloads[key].potentialSaving =
                cost.workloads[key].potentialSaving + e.potentialSaving;
            }

            if (e.exactPeriodCost || e.optimizedPeriodCost) {
              if (e.optimizedPeriodCost) {
                cost.optimizedRun = cost.optimizedRun + e.optimizedPeriodCost;

                cost.workloads[key].optimizedRun =
                  cost.workloads[key].optimizedRun + e.optimizedPeriodCost;
              } else {
                cost.optimizedRun = cost.optimizedRun + e.exactPeriodCost;

                cost.workloads[key].optimizedRun =
                  cost.workloads[key].optimizedRun + e.exactPeriodCost;
              }
            }
          }
        } else if (e.type === 'AWSAPIGATEWAYAPI') {
          if (e.requestCost) {
            cost.estimated = cost.estimated + e.requestCost;
            cost.workloads[key].estimated =
              cost.workloads[key].estimated + e.requestCost;
          }
        } else if (e.type === 'AWSELASTICSEARCHNODE') {
          if (e.periodCost) {
            cost.known = cost.known + e.periodCost;
            cost.workloads[key].known =
              cost.workloads[key].known + e.periodCost;
          }
        } else if (e.type === 'AWSSQSQUEUE') {
          if (e.messageCostStandardPerReq) {
            const calc =
              e.messageCostStandardPerReq * e.QueueSample?.numberOfMessages ||
              0;

            cost.known = cost.known + calc;
            cost.workloads[key].known = cost.workloads[key].known + calc;
          }
        } else if (e.type === 'AWSALB') {
          if (e.periodCost) {
            cost.estimated = cost.estimated + e.periodCost;
            cost.workloads[key].estimated =
              cost.workloads[key].estimated + e.periodCost;
          }
        } else if (e.type === 'AWSELB') {
          if (e.periodCost) {
            cost.estimated = cost.estimated + e.periodCost;
            cost.workloads[key].estimated =
              cost.workloads[key].estimated + e.periodCost;
          }
        } else if (e.type === 'AWSLAMBDAFUNCTION') {
          const calc = (e.durationCost || 0) + (e.requestCost || 0);
          cost.known = cost.known + calc;
          cost.workloads[key].known = cost.workloads[key].known + calc;
        } else if (e.type === 'AWSRDSDBINSTANCE') {
          if (e.periodCost) {
            cost.known = cost.known + e.periodCost;
            cost.workloads[key].known =
              cost.workloads[key].known + e.periodCost;
          }
        } else if (e.type === 'AWSELASTICACHEREDISNODE') {
          if (e.periodCost) {
            cost.known = cost.known + e.periodCost;
            cost.workloads[key].known =
              cost.workloads[key].known + e.periodCost;
          }
        }
      }
    });
  });

  return cost;
}

export function checkTags(entity, selectedTags) {
  // if no selected tags, return all entities
  const tags = Object.keys(selectedTags || {});
  if (tags.length === 0) {
    return true;
  }

  // if entity has no tags, don't return it
  const entityTags = Object.keys(entity.tags || {});
  if (entityTags === 0) {
    return false;
  }

  for (let z = 0; z < tags.length; z++) {
    const tag = tags[z];
    if (entity?.tags?.[tag]) {
      const tagValues = selectedTags?.[tag];
      const entityValues = entity.tags[tag] || [];

      for (let y = 0; y < entityValues.length; y++) {
        if (tagValues?.[entityValues[y]]) {
          return true;
        }
      }
    }
  }

  return false;
}
