module.exports = {
    getTimeRange(nr1){
        const { timeRange } = nr1.launcher.state
        if(!timeRange){
          return ''
        }else if(timeRange.begin_time && timeRange.end_time) {
          return ` SINCE ${timeRange.begin_time} UNTIL ${timeRange.end_time}`
        }else if(timeRange.duration) {
          return ` SINCE ${timeRange.duration / 1000} SECONDS AGO`
        }
        return ''
    },
    determineAwsInstance(cfg, awsPricing, instanceData){
        let _ = require('lodash')
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
    },
}

