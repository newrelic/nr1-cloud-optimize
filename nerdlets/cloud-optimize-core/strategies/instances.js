export const addInstanceCostTotal = (entityCostTotals, e) => {
  const state = ((e || {}).optimizedData || {}).state || null;
  let matchedResult = null;
  let matchedPrice = null;
  let optimizedResult = null;
  let optimizedPrice = null;
  let potentialSavings = null;

  entityCostTotals.instances[e.cloud || 'unknown'] += 1;
  e[e.cloud || 'unknown'] = 1;

  // check if dc pricing
  if (!e.cloud) {
    if (e.datacenterSpend) {
      entityCostTotals.instances.currentSpend += e.datacenterSpend;
      entityCostTotals.instances.datacenterSpend += e.datacenterSpend;

      e.currentSpend = e.datacenterSpend;
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

          e.currentSpend = cheapestSpotPrice;
          e.spotSpend = cheapestSpotPrice;
        }
      } else {
        entityCostTotals.instances.currentSpend +=
          matchedResult.onDemandPrice || 0;
        entityCostTotals.instances.nonSpotSpend +=
          matchedResult.onDemandPrice || 0;
        matchedPrice = matchedResult.onDemandPrice || 0;

        e.currentSpend = matchedResult.onDemandPrice || 0;
        e.nonSpotSpend = matchedResult.onDemandPrice || 0;
      }
    }
  }

  if (e.cloud) {
    entityCostTotals.instances.cloudSpend += matchedPrice;
    e.cloudSpend = matchedPrice;
  } else {
    entityCostTotals.instances.datacenterSpend += matchedPrice;
    e.datacenterSpend = matchedPrice;
  }

  switch (state) {
    case 'skip':
      entityCostTotals.instances.skippedInstances += 1;
      e.skippedInstances = 1;
      break;
    case 'excluded':
      entityCostTotals.instances.excludedInstances += 1;
      e.excludedInstances = 1;
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

    // do not add pricing if the current spend is not more than 0
    // having the optimizedResult is okay for suggestions
    if (optimizedResult && e.currentSpend > 0) {
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

        e.optimizedSpend = optimizedResult.cheapestOptimizedSpotPrice;
        e.optimizedSpotSpend = optimizedResult.cheapestOptimizedSpotPrice;
      } else {
        if (cheapestOptimizedSpotPrice) {
          if (matchedPrice > 0) {
            const potentialSavingsWithSpot =
              matchedPrice - cheapestOptimizedSpotPrice || 0;

            entityCostTotals.instances.potentialSavingsWithSpot += potentialSavingsWithSpot;

            e.potentialSavingsWithSpot = potentialSavingsWithSpot;
          }

          e.spotPrice = cheapestOptimizedSpotPrice;
        } else if (e.spot) {
          e.unableToGetSpotPriceUsingOnDemand = true;
        }

        entityCostTotals.instances.optimizedSpend +=
          optimizedResult.onDemandPrice;

        entityCostTotals.instances.optimizedNonSpotSpend +=
          optimizedResult.onDemandPrice;

        optimizedPrice = optimizedResult.onDemandPrice;

        e.optimizedSpend = optimizedResult.onDemandPrice;
        e.optimizedNonSpotSpend = optimizedResult.onDemandPrice;
      }
    }
    // end optimized results

    if (!e.unableToGetOnPremPrice && matchedPrice > 0) {
      potentialSavings = matchedPrice - optimizedPrice;
      entityCostTotals.instances.potentialSavings += potentialSavings;
      e.potentialSavings = potentialSavings;
      e.matchedPrice = matchedPrice;
      e.optimizedPrice = optimizedPrice;

      e.currentSpend = matchedPrice;
      e.optimizedPrice = optimizedPrice;
    }
  }

  //   console.log(entityCostTotals, e);

  //   return entityCostTotals;
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
