const _ = require('lodash')

export const pluckAwsPrice = (instanceType, operatingSystem, awsPricing) => {
  for(var i=0;i<awsPricing.prices.length;i++){
      if( awsPricing.prices[i].attributes["aws:ec2:preInstalledSw"] == "NA" &&
          awsPricing.prices[i].attributes["aws:ec2:instanceType"] == instanceType &&
          awsPricing.prices[i].attributes["aws:ec2:operatingSystem"].toLowerCase() == operatingSystem.toLowerCase()
      ){
          return parseFloat(awsPricing.prices[i].price.USD)
      }
  }
  console.log(`unable to get aws price for ${instanceType} : ${operatingSystem}`)
  return 0
}

export const processSample = (account, sample, config, networkSamples, awsPricing) => {
  sample.timeSinceLastReported = new Date().getTime() - sample.timestamp
  sample.hostname = sample.facet[0]
  sample.apmApplicationNames = sample.facet[1]
  sample.entityGuid = sample.facet[2]
  sample.awsRegion = sample.facet[3]
  sample.apps = sample.facet[1] ? sample.facet[1].split("|").filter(Boolean) : []
  sample.memGB = Math.round(sample.memTotalBytes/1024/1024/1024)
  sample.numCpu = parseFloat(sample.numCpu)
  sample.awsInstanceType = sample.ec2InstanceType
  sample.receiveBytesPerSecond = 0
  sample.transmitBytesPerSecond = 0

  for(let z=0;z<networkSamples.length;z++){
      if(sample.entityGuid == networkSamples[z].facet[1]){
          sample.receiveBytesPerSecond = networkSamples[z].receiveBytesPerSecond
          sample.transmitBytesPerSecond = networkSamples[z].transmitBytesPerSecond
          break
      }
  }

  sample.awsPrice1 = pluckAwsPrice(sample.ec2InstanceType || sample.instanceType, sample.operatingSystem, awsPricing) * config.discountMultiplier
  sample.suggestions = determineAwsInstance(config, awsPricing, sample)

  if(sample.suggestions){
      let optimizedSuggestion = sample.suggestions.suggested
      sample.suggestedInstanceType = optimizedSuggestion.instanceType
      sample.awsPrice2 = parseFloat(optimizedSuggestion.price) * config.discountMultiplier
      sample.saving = sample.awsPrice1 - sample.awsPrice2
  }

  sample.accountId = account.id
  sample.accountName = account.name

  return sample
}

export const groupInstances = (data, type, val, state) => {
        let tempData = data || state.instanceData
        let { awsPricing, config, groupByDefault } = state
        let groupBy = (type == "groupBy" ? val : null) || config.groupBy || groupByDefault

        if(type == "awsPricingRegion" || type == "recalc"){
            tempData.forEach((sample,i)=>{
                tempData[i].awsPrice1 = pluckAwsPrice(sample.ec2InstanceType || sample.instanceType, sample.operatingSystem, awsPricing) * config.discountMultiplier
                tempData[i].suggestions = determineAwsInstance(config, awsPricing, tempData[i])
                if(tempData[i].suggestions){
                    let optimizedSuggestion = tempData[i].suggestions.suggested
                    tempData[i].suggestedInstanceType = optimizedSuggestion.instanceType
                    tempData[i].awsPrice2 = parseFloat(optimizedSuggestion.price) * config.discountMultiplier
                    tempData[i].saving = tempData[i].awsPrice1 - tempData[i].awsPrice2
                }else{
                    tempData[i].awsPrice2 = 0
                    tempData[i].saving = 0
                }
            })
        }

        let totals = {
            optimizedCost: 0,
            nonOptimizedCost: 0,
            saving: 0,
            optimizedCount: 0,
            nonOptimizedCount: 0
        }

        let grouped = _(tempData)
            .groupBy(x => x[groupBy])
            .map((value, key) => { 
                let summary = {
                    optimizedCost: 0,
                    nonOptimizedCost: 0,
                    saving: 0,
                    optimizedCount: 0,
                    nonOptimizedCount: 0,
                    totalInstances: value.length
                }

                value.forEach((instance)=>{
                    if(instance.saving > 0 && instance.instanceType == "stale"){
                        summary.optimizedCost += instance.awsPrice2
                        summary.nonOptimizedCost += instance.awsPrice1
                        summary.saving += instance.saving
                        summary.nonOptimizedCount++

                        totals.optimizedCost += instance.awsPrice2
                        totals.nonOptimizedCost += instance.awsPrice1
                        totals.saving += instance.saving
                        totals.nonOptimizedCount++
                    }else if(instance.saving > 0 && (instance.maxCpuPercent <  config.optimizeBy || instance.maxMemoryPercent <  config.optimizeBy)){
                        summary.optimizedCost += instance.awsPrice2
                        summary.nonOptimizedCost += instance.awsPrice1
                        summary.saving += instance.saving
                        summary.nonOptimizedCount++

                        totals.optimizedCost += instance.awsPrice2
                        totals.nonOptimizedCost += instance.awsPrice1
                        totals.saving += instance.saving
                        totals.nonOptimizedCount++

                        if(instance.maxCpuPercent < config.optimizeBy && instance.maxMemoryPercent < config.optimizeBy){
                            instance.suggestion = "CPU & Memory Optimize"
                        }else if(instance.maxCpuPercent < config.optimizeBy){
                            instance.suggestion = "Memory Optimize"
                        }else if(instance.maxMemoryPercent < config.optimizeBy){
                            instance.suggestion = "CPU Optimize"
                        }
                    }else{
                        summary.optimizedCount++
                        totals.optimizedCount++
                    }

                })
                return (
                    {group: key, instances: value, ...summary}) 
                })
            .value();
    return { totals, grouped, tempData }
}

export const determineAwsInstance = (cfg, awsPricing, instanceData) => {
  let numCpu = instanceData.numCpu * cfg.rightSizeCpu
  let memoryGb = instanceData.memGB * cfg.rightSizeMem
  let discoveredPrices = []
  let strategy = "cost"

  // Instance Inclusion 
  if(instanceData.timeSinceLastReported > (parseFloat(cfg.lastReportPeriod) * 3600000)){
      return null
  }

  // Stale Instance Detection
  let cpuStale = false
  let cpuCheck = false
  let memStale = false
  let memCheck = false
  let recStale = false
  let recCheck = false
  let traStale = false
  let traCheck = false

  if(cfg.staleInstanceCpu > 0){
      cpuCheck = true
      if(instanceData.maxCpuPercent <= cfg.staleInstanceCpu){
          cpuStale = true
      }
  }    
  
  if(cfg.staleInstanceMem > 0){
      memCheck = true
      if(instanceData.maxMemoryPercent <= cfg.staleInstanceMem){
          memStale = true
      }
  }

  if(cfg.staleReceiveBytesPerSecond > 0){
      recCheck = true
      if(instanceData.receiveBytesPerSecond <= cfg.staleReceiveBytesPerSecond){
          recStale = true
      }
  }

  if(cfg.staleTransmitBytesPerSecond > 0){
      traCheck = true
      if(instanceData.transmitBytesPerSecond <= cfg.staleTransmitBytesPerSecond){
          traStale = true
      }
  }

  if(cpuCheck == cpuStale && memCheck == memStale && recCheck == recStale && traCheck == traStale){
      discoveredPrices.push({ 
          price: 0, 
          instanceType: "stale",
          suggestion: "stale",
          strategy: strategy
      }) 

      let priceDiscovery = {
          cheapest: discoveredPrices[0],
          suggested: discoveredPrices[0],
          all: discoveredPrices
      }

      return priceDiscovery
  }

  function checkExclusion(instances, instanceType){
      for(let y=0;y<instances.length;y++){
          if(instanceType.includes(instances[y])){
              return true
          }
      }
      return false
  }
  
  if(awsPricing && awsPricing.prices){
      let prices = awsPricing.prices

      // store combinations per family, eg. combinations for direct match, cpu+, mem+, cpu and mem+
      let instanceFamiliesDirect = {}
      let instanceFamiliesCpu = {}
      let instanceFamiliesMem = {}
      let instanceFamiliesCpuMem = {}

      // order price list by cost
      prices = _.orderBy(prices, [ function(e) { return e["price"]["USD"] } ], [ "asc", "desc"])            

      for(var i=0;i<prices.length;i++){

          if(instanceData.operatingSystem != prices[i]["attributes"]["aws:ec2:operatingSystem"].toLowerCase() || checkExclusion(cfg.instanceOptionsCurrent, prices[i]["attributes"]["aws:ec2:instanceType"])){
              continue
          }

          // directly matching 
          if(prices[i]["attributes"]["aws:ec2:vcpu"] == numCpu && 
              parseFloat(prices[i]["attributes"]["aws:ec2:memory"]) == memoryGb &&
              prices[i]["attributes"]["aws:ec2:term"] == "on-demand"){

              if(!instanceFamiliesDirect[prices[i]["attributes"]["aws:ec2:instanceFamily"]]){
                  let payload = {
                      price: (parseFloat(prices[i].price.USD)).toFixed(2), 
                      instanceType: prices[i]["attributes"]["aws:ec2:instanceType"],
                      instanceFamily: prices[i]["attributes"]["aws:ec2:instanceFamily"],
                      vcpu: prices[i]["attributes"]["aws:ec2:vcpu"],
                      ecu: prices[i]["attributes"]["aws:ec2:ecu"],
                      memory: prices[i]["attributes"]["aws:ec2:memory"],
                      strategy: strategy
                  }
                  instanceFamiliesDirect[prices[i]["attributes"]["aws:ec2:instanceFamily"]] = payload
                  discoveredPrices.push(payload)
                  continue
              }
          }

          // a bit more cpu
          if(prices[i]["attributes"]["aws:ec2:vcpu"] > numCpu && 
              parseFloat(prices[i]["attributes"]["aws:ec2:memory"]) == memoryGb &&
              prices[i]["attributes"]["aws:ec2:term"] == "on-demand"){

              if(!instanceFamiliesCpu[prices[i]["attributes"]["aws:ec2:instanceFamily"]]){
                  let payload = {
                      price: (parseFloat(prices[i].price.USD)).toFixed(2), 
                      instanceType: prices[i]["attributes"]["aws:ec2:instanceType"],
                      instanceFamily: prices[i]["attributes"]["aws:ec2:instanceFamily"],
                      vcpu: prices[i]["attributes"]["aws:ec2:vcpu"],
                      ecu: prices[i]["attributes"]["aws:ec2:ecu"],
                      memory: prices[i]["attributes"]["aws:ec2:memory"],
                      strategy: strategy
                  }
                  instanceFamiliesCpu[prices[i]["attributes"]["aws:ec2:instanceFamily"]] = payload
                  discoveredPrices.push(payload)
                  continue
              }
          }

          // a bit more mem
          if(prices[i]["attributes"]["aws:ec2:vcpu"] == numCpu && 
              parseFloat(prices[i]["attributes"]["aws:ec2:memory"]) > memoryGb &&
              prices[i]["attributes"]["aws:ec2:term"] == "on-demand"){

              if(!instanceFamiliesMem[prices[i]["attributes"]["aws:ec2:instanceFamily"]]){
                  let payload = {
                      price: (parseFloat(prices[i].price.USD)).toFixed(2), 
                      instanceType: prices[i]["attributes"]["aws:ec2:instanceType"],
                      instanceFamily: prices[i]["attributes"]["aws:ec2:instanceFamily"],
                      vcpu: prices[i]["attributes"]["aws:ec2:vcpu"],
                      ecu: prices[i]["attributes"]["aws:ec2:ecu"],
                      memory: prices[i]["attributes"]["aws:ec2:memory"],
                      strategy: strategy
                  }
                  instanceFamiliesMem[prices[i]["attributes"]["aws:ec2:instanceFamily"]] = payload
                  discoveredPrices.push(payload)
                  continue
              }
          }

          // a bit more cpu & mem
          if(prices[i]["attributes"]["aws:ec2:vcpu"] > numCpu && 
              parseFloat(prices[i]["attributes"]["aws:ec2:memory"]) > memoryGb &&
              prices[i]["attributes"]["aws:ec2:term"] == "on-demand"){

              if(!instanceFamiliesCpuMem[prices[i]["attributes"]["aws:ec2:instanceFamily"]]){
                  let payload = {
                      price: (parseFloat(prices[i].price.USD)).toFixed(2), 
                      instanceType: prices[i]["attributes"]["aws:ec2:instanceType"],
                      instanceFamily: prices[i]["attributes"]["aws:ec2:instanceFamily"],
                      vcpu: prices[i]["attributes"]["aws:ec2:vcpu"],
                      ecu: prices[i]["attributes"]["aws:ec2:ecu"],
                      memory: prices[i]["attributes"]["aws:ec2:memory"],
                      strategy: strategy
                  }
                  instanceFamiliesCpuMem[prices[i]["attributes"]["aws:ec2:instanceFamily"]] = payload
                  discoveredPrices.push(payload)
                  continue
              }
          }
      }

      if(discoveredPrices.length>0){

          let priceDiscovery = {
              cheapest: discoveredPrices[0],
              suggested: discoveredPrices[0],
              all: discoveredPrices
          }

          if(instanceData.maxCpuPercent >= cfg.optimizeBy){
              for(let z=0;z<discoveredPrices.length;z++){
                  if(discoveredPrices[z].instanceFamily.includes("Compute")){
                      priceDiscovery.suggested = discoveredPrices[z]
                      break
                  }
              }
          }else if(instanceData.maxMemoryPercent >= cfg.optimizeBy){
              for(let z=0;z<discoveredPrices.length;z++){
                  if(discoveredPrices[z].instanceFamily.includes("Memory")){
                      priceDiscovery.suggested = discoveredPrices[z]
                      break
                  }
              }
          }
          return priceDiscovery
      }

      return null
  }
}