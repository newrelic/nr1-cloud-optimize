// calculate cost aggregate data and savings
export default function(workloadData, tags) {
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
            const onDemandPrice = e?.matches?.exact?.[0]?.onDemandPrice;
            if (onDemandPrice) {
              cost.known = cost.known + onDemandPrice;
              cost.workloads[key].known =
                cost.workloads[key].known + onDemandPrice;
            }

            const estimatedPrice = e?.matches?.estimated?.[0]?.onDemandPrice;
            if (estimatedPrice) {
              cost.estimated = cost.estimated + estimatedPrice;
              cost.workloads[key].estimated =
                cost.workloads[key].estimated + estimatedPrice;
            }

            const optimizedOnDemandPrice =
              e?.matches?.optimized?.[0]?.onDemandPrice;
            if (optimizedOnDemandPrice) {
              cost.optimized = cost.optimized + optimizedOnDemandPrice;
              cost.potentialSaving = onDemandPrice - optimizedOnDemandPrice;

              cost.workloads[key].optimized =
                cost.workloads[key].optimized + optimizedOnDemandPrice;
              cost.workloads[key].potentialSaving =
                onDemandPrice - optimizedOnDemandPrice;

              e.potentialSaving = onDemandPrice - optimizedOnDemandPrice;
            }

            if (onDemandPrice || optimizedOnDemandPrice) {
              if (optimizedOnDemandPrice) {
                cost.optimizedRun = cost.optimizedRun + optimizedOnDemandPrice;

                cost.workloads[key].optimizedRun =
                  cost.workloads[key].optimizedRun + optimizedOnDemandPrice;
              } else {
                cost.optimizedRun = cost.optimizedRun + onDemandPrice;

                cost.workloads[key].optimizedRun =
                  cost.workloads[key].optimizedRun + onDemandPrice;
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
          const instance = e?.discoveredPrices?.[0];
          if (instance) {
            cost.known = cost.known + parseFloat(instance?.price);
            cost.workloads[key].known =
              cost.workloads[key].known + parseFloat(instance?.price);
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
