// const entityCostTotals = {
//     instances: {
//       currentSpend: 0,
//       optimizedSpend: 0,
//       datacenterSpend: 0,
//       cloudSpend: 0,
//       spotSpend:0,
//       nonSpotSpend: 0,
//       optimizedNonSpotSpend: 0,
//       optimizedSpotSpend: 0,
//       potentialSavings: 0,
//       potentialSavingsWithSpot: 0,
//       staleInstances: 0,
//       excludedInstances: 0,
//       skippedInstances: 0,
//       optimizedInstances: 0
//     }
//   };

export const addInstanceCostTotal = (entityCostTotals, e) => {
  const state = ((e || {}).optimizedData || {}).state || null;
  let matchedResult = null;
  let matchedPrice = null;
  let optimizedResult = null;
  let optimizedPrice = null;
  let potentialSavings = null;

  // check if dc pricing
  if (!e.cloud) {
    if (e.DatacenterCUCost) {
      entityCostTotals.instances.currentSpend += e.DatacenterCUCost;
      entityCostTotals.instances.datacenterSpend += e.DatacenterCUCost;
    } else {
      e.unableToGetOnPremPrice = true;
      matchedPrice = 0;
    }
  } else {
    // use instance result, else use matched
    if (e.instanceResult) {
      matchedResult = e.instanceResult;
      e.usingInstanceResult = true;
    } else {
      // look at matched instance for pricing
      const matchedExactMatch = getCheapestInstanceMatch(
        ((e || {}).matchedInstances || {}).exactMatchedProducts || {}
      );

      if (matchedExactMatch) {
        matchedResult = matchedExactMatch;
      } else {
        const matchedNextMatch = getCheapestInstanceMatch(
          ((e || {}).matchedInstances || {}).nextMatchedProducts || {}
        );
        if (matchedNextMatch) {
          matchedResult = matchedNextMatch;
        }
      }

      e.usingMatchedResult = true;
    }

    if (matchedResult) {
      e.matchedResult = matchedResult;
      if (e.spot) {
        // use spot pricing
        let cheapestSpotPrice = null;
        for (let z = 0; z < (matchedResult.spotPrice || []).length; z++) {
          if (
            matchedResult.spotPrice[z].price < cheapestSpotPrice ||
            cheapestSpotPrice === null
          ) {
            cheapestSpotPrice = matchedResult.spotPrice[z].price;
          }
        }
        if (cheapestSpotPrice) {
          entityCostTotals.instances.currentSpend += cheapestSpotPrice || 0;
          entityCostTotals.instances.spotSpend += cheapestSpotPrice || 0;
          matchedPrice = cheapestSpotPrice || 0;
        }
      } else {
        entityCostTotals.instances.currentSpend +=
          matchedResult.onDemandPrice || 0;
        entityCostTotals.instances.nonSpotSpend +=
          matchedResult.nonSpotSpend || 0;
        matchedPrice = matchedResult.onDemandPrice || 0;
      }
    }
  }

  switch (state) {
    case 'skip':
      entityCostTotals.instances.skippedInstances += 1;
      break;
    case 'excluded':
      entityCostTotals.instances.excludedInstances += 1;
      break;
  }

  if (state !== 'skip' || state !== 'excluded' || state !== 'stale') {
    // optimized results
    const optimizedExactMatch = getCheapestInstanceMatch(
      (((e || {}).optimizedData || {}).matchedInstances || {})
        .exactMatchedProducts || {}
    );

    if (optimizedExactMatch) {
      optimizedResult = optimizedExactMatch;
    } else {
      const optimizedNextMatch = getCheapestInstanceMatch(
        (((e || {}).optimizedData || {}).matchedInstances || {})
          .nextMatchedProducts || {}
      );
      if (optimizedNextMatch) {
        optimizedResult = optimizedNextMatch;
      }
    }

    if (optimizedResult) {
      entityCostTotals.instances.optimizedInstances += 1;

      e.optimizedResult = optimizedResult;

      let cheapestOptimizedSpotPrice = null;
      for (let z = 0; z < (optimizedResult.spotPrice || []).length; z++) {
        if (
          optimizedResult.spotPrice[z].price < cheapestOptimizedSpotPrice ||
          cheapestOptimizedSpotPrice === null
        ) {
          cheapestOptimizedSpotPrice = optimizedResult.spotPrice[z].price;
        }
      }

      if (e.spot && cheapestOptimizedSpotPrice) {
        // use spot pricing
        entityCostTotals.instances.optimizedSpend +=
          optimizedResult.cheapestOptimizedSpotPrice;

        entityCostTotals.instances.optimizedSpotSpend +=
          cheapestOptimizedSpotPrice || 0;

        optimizedPrice = cheapestOptimizedSpotPrice || 0;
      } else {
        if (cheapestOptimizedSpotPrice) {
          const potentialSavingsWithSpot =
            optimizedResult.onDemandPrice - cheapestOptimizedSpotPrice || 0;

          entityCostTotals.instances.potentialSavingsWithSpot += potentialSavingsWithSpot;

          e.potentialSavingsWithSpot = potentialSavingsWithSpot;

          e.spotPrice = cheapestOptimizedSpotPrice;
        } else if (e.spot) {
          e.unableToGetSpotPriceUsingOnDemand = true;
        }

        entityCostTotals.instances.optimizedSpend +=
          optimizedResult.onDemandPrice;

        entityCostTotals.instances.optimizedNonSpotSpend +=
          optimizedResult.onDemandPrice;

        optimizedPrice = optimizedResult.onDemandPrice;
      }
    }
    // end optimized results

    if (!e.unableToGetOnPremPrice) {
      potentialSavings = matchedPrice - optimizedPrice;
      entityCostTotals.potentialSavings += potentialSavings;
      e.potentialSavings = potentialSavings;
    }
  }

  //   console.log(entityCostTotals, e);

  return entityCostTotals;
};

const getCheapestInstanceMatch = matches => {
  let cheapestCategory = null;
  let cheapestPrice = null;

  Object.keys(matches).forEach(category => {
    if (!cheapestPrice || matches[category].onDemandPrice < cheapestPrice) {
      cheapestCategory = category;
      cheapestPrice = matches[category].onDemandPrice;
    }
  });

  return matches[cheapestCategory];
};

// const fakeInstance = (state, cost) => ({
//   category: state,
//   type: state,
//   onDemandPrice: cost || 0,
//   cpusPerVm: 0,
//   memPerVm: 0,
//   attributes: { cpu: '0', instanceTypeCategory: state, memory: '0' }
// });
