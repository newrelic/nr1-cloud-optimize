export const defaultUserConfig = function() {
  return {
    optimizeBy: 50,
    groupBy: '',
    sortBy: '',
    sort: 'desc',
    discountMultiplier: 1,
    lastReportPeriod: 24, // 1 day in hours
    staleInstanceCpu: 5,
    staleInstanceMem: 5,
    staleReceiveBytesPerSecond: 0,
    staleTransmitBytesPerSecond: 0,
    rightSizeCpu: 0.5,
    rightSizeMem: 0.5,
    instanceOptionsCurrent: [],
    instanceOptions: [],
    cloudData: {
      amazon: 'us-east-1',
      azure: 'eastus',
      google: 'us-east1',
    },
  };
};
