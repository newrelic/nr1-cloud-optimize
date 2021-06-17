/* eslint 
no-console: 0
*/

import _ from 'lodash';

export const getInstance = (region, type, engine, index) => {
  if (engine === 'postgres') engine = 'postgresql';
  return new Promise(resolve => {
    fetch(
      `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/rds/pricing/${region}/${type}/${engine}.json`
    )
      .then(response => {
        return response.json();
      })
      .then(json => {
        if (json) {
          json.index = index;
          resolve(json);
        } else {
          resolve(null);
        }
      })
      .catch(() => {
        console.log('error');
        resolve(null);
      });
  });
};

export const processOptimizationSuggestions = (sample, rules) => {
  return new Promise(resolve => {
    if (!sample.pricing) {
      console.log(
        `${sample.entityName} ${sample.entityGuid} has no pricing data`
      );
      resolve();
    }

    const cpuUsage = sample.maxCpuUtilization;

    // process rules
    sample.failures = [];
    sample.isStale = false;

    // track what to optimize
    let performOptimization = false;
    const optimize = {
      cpu: false,
      memory: false
    };

    // cpu
    if (rules.cpu !== 0 && cpuUsage < rules.cpu) {
      sample.failures.push(
        `Low CPU ${(cpuUsage || 0).toFixed(2)} < ${rules.cpu}`
      );
      optimize.cpu = true;
      performOptimization = true;
    }

    const staleChecks = [
      {
        msg: 'Stale CPU',
        staleMetric: 'cpuStale',
        value: sample.maxCpuUtilization,
        fixed: 2
      }
    ];

    staleChecks.forEach(s => {
      const value = s.fixed !== undefined ? (s.value || 0).toFixed(2) : s.value;

      if (
        rules[s.staleMetric] &&
        rules[s.staleMetric] !== 0 &&
        s.value < rules[s.staleMetric]
      ) {
        sample.failures.push(`${s.msg} ${value} < ${rules[s.staleMetric]}`);
        sample.isStale = true;
        performOptimization = false;
        sample.potentialSavings = sample.pricing.onDemandPrice;
      }
    });

    // --------------------

    // attempt to find new candidates if any rule failures

    if (performOptimization) {
      fetch(
        `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/compute/pricing/${sample.awsRegion}.json`
      )
        .then(response => {
          return response.json();
        })
        .then(json => {
          if (json) {
            // handle edge case
            if (!sample.maxCpuUtilization) {
              return false;
            }

            let lowestVcpu = sample.pricing.attributes.cpu;

            if (optimize.cpu) {
              lowestVcpu = Math.round(lowestVcpu * (cpuUsage / 100));
              lowestVcpu = lowestVcpu <= 0 ? 1 : lowestVcpu;
            }

            const cheaperProducts = json.products.filter(p => {
              const price = p?.onDemandPrice || null;

              if (price) {
                if (
                  parseFloat(price) < parseFloat(sample.pricing.onDemandPrice)
                ) {
                  const productVcpu = p.attributes.cpu;

                  if (
                    optimize.cpu &&
                    !(parseFloat(productVcpu) > parseFloat(lowestVcpu))
                  ) {
                    return false;
                  }

                  return true;
                }
              }
              return false;
            });

            sample.optimizationCandidates = _.sortBy(cheaperProducts, [
              o => parseFloat(o.onDemandPrice)
            ]);

            if (cheaperProducts.length > 0) {
              const firstCandidate = sample.optimizationCandidates[0];
              sample.suggestedPrice = firstCandidate?.onDemandPrice || null;
              sample.suggestedType = firstCandidate?.type || null;
              sample.potentialSavings =
                sample.pricing.onDemandPrice - sample.suggestedPrice;
            }

            resolve();
          } else {
            // unable to get available instances
            sample.noRecommendation = true;
            resolve();
          }
        })
        .catch(() => {
          console.log(
            `unable to attempt optimization for ${sample.entityName}`
          );
          resolve(null);
        });
    } else {
      resolve();
    }
  });
};

export const calculateMetricTotals = entities => {
  const totals = { currentSpend: 0, potentialSavings: 0, estimatedNewSpend: 0 };

  entities.forEach(e => {
    totals.currentSpend += parseFloat(e.price) || 0;
    totals.potentialSavings += parseFloat(e.potentialSavings) || 0;

    if (!e.isStale) {
      totals.estimatedNewSpend +=
        e.suggestedPrice !== undefined && e.suggestedPrice !== null
          ? parseFloat(e.suggestedPrice)
          : parseFloat(e.price) || 0;
    }
  });

  return totals;
};
