const _ = require('lodash')

export const pluckCloudInstance = (instanceType, operatingSystem, cloudData) => {
    let clouds = Object.keys(cloudData)
    for(var i=0;i<clouds.length;i++){
        for(var z=0;z<cloudData[clouds[i]].length;z++){
            if(cloudData[clouds[i]][z].type == instanceType){
                let instance = cloudData[clouds[i]][z]
                instance.cloud = clouds[i]
                return instance
            }
        }
    }
    //console.log(`unable to get cloud instance price for ${instanceType} : ${operatingSystem}`)
    return false
}

export const processSample = (account, sample, config, networkSamples, cloudData) => {
  sample.timeSinceLastReported = new Date().getTime() - sample.timestamp
  sample.hostname = sample.facet
  sample.apps = sample.apmApplicationNames ? sample.apmApplicationNames.split("|").filter(Boolean) : []
  sample.memGB = Math.round(sample.memTotalBytes/1024/1024/1024)
  sample.numCpu = parseFloat(sample.numCpu)
  sample.awsInstanceType = sample.ec2InstanceType
  sample.receiveBytesPerSecond = 0
  sample.transmitBytesPerSecond = 0

  if(sample.awsRegion){
    sample.region = `aws-${sample.awsRegion}`
  }else if(sample.regionName){
    sample.region = `azure-${sample.regionName}`
  }else if(sample.zone){
    sample.region = `gcp-${sample.zone}`
  }

  for(let z=0;z<networkSamples.length;z++){
      if(sample.entityGuid == networkSamples[z].entityGuid){
          sample.receiveBytesPerSecond = networkSamples[z].receiveBytesPerSecond
          sample.transmitBytesPerSecond = networkSamples[z].transmitBytesPerSecond
          break
      }
  }

  sample.matchedInstance = pluckCloudInstance(sample.ec2InstanceType || sample.instanceType, sample.operatingSystem, cloudData)
  if(sample.matchedInstance){
    sample.instancePrice1 = sample.matchedInstance.onDemandPrice * config.discountMultiplier
    sample.suggestions = determineCloudInstance(config, sample, cloudData)
  
    if(sample.suggestions){
      let optimizedSuggestion = sample.suggestions.suggested
      sample.suggestedInstanceType = optimizedSuggestion.instanceType
      sample.instancePrice2 = parseFloat(optimizedSuggestion.price) * config.discountMultiplier
      sample.saving = sample.instancePrice1 - sample.instancePrice2
    }
  
    sample.accountId = account.id
    sample.accountName = account.name
  
    return sample
  }

  return null
}

export const groupInstances = (data, type, val, state, forceGroupBy) => {
        let tempData = data || state.instanceData
        let { config, groupByDefault, cloudData } = state
        let groupBy = forceGroupBy ? "nr.cloud.optimize.flat" : (type == "groupBy" ? val : null) || config.groupBy || groupByDefault

        if(type == "awsPricingRegion" || type == "recalc"){
            tempData.forEach((sample,i)=>{

                // reset
                sample.suggestions = null
                sample.suggestion = null
                tempData[i].instancePrice1 = 0
                tempData[i].instancePrice2 = 0
                tempData[i].saving = 0
                //

                tempData[i].matchedInstance = pluckCloudInstance(tempData[i].ec2InstanceType || tempData[i].instanceType, tempData[i].operatingSystem, cloudData)
                tempData[i].instancePrice1 = tempData[i].matchedInstance.onDemandPrice * config.discountMultiplier
                sample.suggestions = determineCloudInstance(config, tempData[i], cloudData)

                if(tempData[i].suggestions){    
                    let optimizedSuggestion = tempData[i].suggestions.suggested
                    tempData[i].suggestedInstanceType = optimizedSuggestion.instanceType
                    tempData[i].instancePrice2 = parseFloat(optimizedSuggestion.price) * config.discountMultiplier
                    tempData[i].saving = tempData[i].instancePrice1 - tempData[i].instancePrice2
                }else{
                    tempData[i].instancePrice2 = 0
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
                        summary.optimizedCost += instance.instancePrice2
                        summary.nonOptimizedCost += instance.instancePrice1
                        summary.saving += instance.saving
                        summary.nonOptimizedCount++

                        totals.optimizedCost += instance.instancePrice2
                        totals.nonOptimizedCost += instance.instancePrice1
                        totals.saving += instance.saving
                        totals.nonOptimizedCount++
                    }else if(instance.saving > 0 && (instance.maxCpuPercent <  config.optimizeBy || instance.maxMemoryPercent <  config.optimizeBy)){
                        summary.optimizedCost += instance.instancePrice2
                        summary.nonOptimizedCost += instance.instancePrice1
                        summary.saving += instance.saving
                        summary.nonOptimizedCount++

                        totals.optimizedCost += instance.instancePrice2
                        totals.nonOptimizedCost += instance.instancePrice1
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

export const determineCloudInstance = (cfg, instanceData, cloudData) => {
  let numCpu = instanceData.numCpu * cfg.rightSizeCpu
  let memoryGb = instanceData.memGB * cfg.rightSizeMem
  let discoveredPrices = []
  let strategy = "cost"
  let cloud = instanceData.matchedInstance.cloud

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
  
  if(cloud && cloudData[cloud]){
      let prices = cloudData[cloud]

      // store combinations per family, eg. combinations for direct match, cpu+, mem+, cpu and mem+
      let instanceFamiliesDirect = {}
      let instanceFamiliesCpu = {}
      let instanceFamiliesMem = {}
      let instanceFamiliesCpuMem = {}

      // order price list by cost
      prices = _.orderBy(prices, [ function(e) { return e["onDemandPrice"] } ], [ "asc", "desc"])            

      for(var i=0;i<prices.length;i++){

          if(checkExclusion(cfg.instanceOptionsCurrent, prices[i]["type"])){
              continue
          }

          // directly matching 
          if(prices[i]["cpusPerVm"] == numCpu && 
              parseFloat(prices[i]["memPerVm"]) == memoryGb){

              if(!instanceFamiliesDirect[prices[i]["category"]]){
                  let payload = {
                      price: (parseFloat(prices[i].onDemandPrice)).toFixed(2), 
                      instanceType: prices[i]["type"],
                      instanceFamily: prices[i]["category"],
                      vcpu: prices[i]["cpusPerVm"],
                      memory: prices[i]["memPerVm"],
                      strategy: strategy
                  }
                  instanceFamiliesDirect[prices[i]["category"]] = payload
                  discoveredPrices.push(payload)
                  continue
              }
          }

          // a bit more cpu
          if(prices[i]["cpusPerVm"] > numCpu && 
              parseFloat(prices[i]["memPerVm"]) == memoryGb){

              if(!instanceFamiliesCpu[prices[i]["category"]]){
                  let payload = {
                      price: (parseFloat(prices[i].onDemandPrice)).toFixed(2), 
                      instanceType: prices[i]["type"],
                      instanceFamily: prices[i]["category"],
                      vcpu: prices[i]["cpusPerVm"],
                      memory: prices[i]["memPerVm"],
                      strategy: strategy
                  }
                  instanceFamiliesCpu[prices[i]["category"]] = payload
                  discoveredPrices.push(payload)
                  continue
              }
          }

          // a bit more mem
          if(prices[i]["cpusPerVm"] == numCpu && 
              parseFloat(prices[i]["memPerVm"]) > memoryGb){

              if(!instanceFamiliesMem[prices[i]["category"]]){
                  let payload = {
                      price: (parseFloat(prices[i].onDemandPrice)).toFixed(2), 
                      instanceType: prices[i]["type"],
                      instanceFamily: prices[i]["category"],
                      vcpu: prices[i]["cpusPerVm"],
                      memory: prices[i]["memPerVm"],
                      strategy: strategy
                  }
                  instanceFamiliesMem[prices[i]["category"]] = payload
                  discoveredPrices.push(payload)
                  continue
              }
          }

          // a bit more cpu & mem
          if(prices[i]["cpusPerVm"] > numCpu && 
              parseFloat(prices[i]["memPerVm"]) > memoryGb){

              if(!instanceFamiliesCpuMem[prices[i]["category"]]){
                  let payload = {
                      price: (parseFloat(prices[i].onDemandPrice)).toFixed(2), 
                      instanceType: prices[i]["type"],
                      instanceFamily: prices[i]["category"],
                      vcpu: prices[i]["cpusPerVm"],
                      memory: prices[i]["memPerVm"],
                      strategy: strategy
                  }
                  instanceFamiliesCpuMem[prices[i]["category"]] = payload
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