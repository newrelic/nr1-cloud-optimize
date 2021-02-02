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

export const processOptimizationSuggestions = (entity, index, rules) => {
  return new Promise(resolve => {
    if (!entity.pricing || !entity.datastoreSample.memory) {
      console.log(`${entity.name} ${entity.guid} has no pricing data`);
      resolve();
    }

    const region = entity.datastoreSample['latest.awsRegion'];
    const engine = entity.datastoreSample['latest.provider.engine'];

    const { memoryUsage, storageUsage } = entity.datastoreSample;
    const cpuUsage =
      entity.datastoreSample['max.provider.cpuUtilization.Average'];
    const connections =
      entity.datastoreSample['max.provider.databaseConnections.Average'];

    // process rules

    entity.failures = [];

    // track what to optimize
    let performOptimization = false;
    const optimize = {
      cpu: false,
      memory: false
    };

    // cpu
    if (rules.cpu !== 0 && cpuUsage < rules.cpu) {
      entity.failures.push(
        `Low CPU ${(cpuUsage || 0).toFixed(2)} < ${rules.cpu}`
      );
      optimize.cpu = true;
      performOptimization = true;
    }

    // memory
    if (rules.memory !== 0 && memoryUsage < rules.memory) {
      entity.failures.push(
        `Low Memory ${(memoryUsage || 0).toFixed(2)} < ${rules.memory}`
      );
      optimize.memory = true;
      performOptimization = true;
    }

    // storage
    if (rules.storageUsage !== 0 && storageUsage < rules.storageUsage) {
      entity.failures.push(
        `Low Storage Usage ${(storageUsage || 0).toFixed(2)} < ${
          rules.storageUsage
        }`
      );
    }

    // connections
    if (rules.connections !== 0 && connections < rules.connections) {
      entity.failures.push(
        `Low Connections ${connections} < ${rules.connections}`
      );
    }

    // stale rules
    // if any stale instances add stale attribute to entity
    // TODO

    // --------------------

    // attempt to find new candidates if any rule failures

    if (performOptimization) {
      fetch(
        `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/amazon/rds/pricing/${region}/${engine}.json`
      )
        .then(response => {
          return response.json();
        })
        .then(json => {
          if (json) {
            // handle edge case
            if (!entity.datastoreSample.memory || entity.datastoreSample.cpu) {
              return false;
            }

            let lowestVcpu = entity.datastoreSample.vcpu;
            let lowestMemory = entity.datastoreSample.memory.split(' ')[0];

            if (optimize.cpu) {
              lowestVcpu = Math.round(lowestVcpu * (cpuUsage / 100));
              lowestVcpu = lowestVcpu <= 0 ? 1 : lowestVcpu;
            }

            if (optimize.memory) {
              lowestMemory = Math.round(lowestMemory * (memoryUsage / 100));
              lowestMemory = lowestMemory <= 0 ? 1 : lowestMemory;
            }

            const cheaperProducts = json.filter(p => {
              const price =
                (((p || {}).onDemandPrice || {}).pricePerUnit || {}).USD ||
                null;

              if (price) {
                if (
                  parseFloat(price) < parseFloat(entity.datastoreSample.price)
                ) {
                  const productMemory = p.attributes.memory.split(' ')[0];
                  const productVcpu = p.attributes.vcpu;

                  // console.log(
                  //   entity.name,
                  //   entity.datastoreSample.vcpu,
                  //   lowestVcpu,
                  //   productVcpu,
                  //   lowestMemory,
                  //   productMemory
                  // );

                  if (
                    optimize.cpu &&
                    !(parseFloat(productVcpu) > parseFloat(lowestVcpu))
                  ) {
                    return false;
                  }

                  if (
                    optimize.memory &&
                    !(parseFloat(productMemory) > parseFloat(lowestMemory))
                  ) {
                    return false;
                  }

                  return true;
                }
              }
              return false;
            });

            entity.optimizationCandidates = _.sortBy(cheaperProducts, [
              o => parseFloat(o.onDemandPrice.pricePerUnit.USD)
            ]);

            if (cheaperProducts.length > 0) {
              const firstCandidate = entity.optimizationCandidates[0];
              entity.suggestedPrice =
                (
                  ((firstCandidate || {}).onDemandPrice || {}).pricePerUnit ||
                  {}
                ).USD || null;
              entity.suggestedType =
                ((firstCandidate || {}).attributes || {}).instanceType || null;

              entity.potentialSavings =
                entity.datastoreSample.price - entity.suggestedPrice;
            }

            resolve();
          } else {
            // unable to get available instances
            entity.noRecommendation = true;
            resolve();
          }
        })
        .catch(() => {
          console.log('unable to attempt optimization');
          resolve(null);
        });
    } else {
      resolve();
    }
  });
};
