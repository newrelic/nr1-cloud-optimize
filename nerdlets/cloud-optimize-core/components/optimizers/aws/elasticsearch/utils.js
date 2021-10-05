export const getElasticsearchNodePricing = (
  ngClusterData,
  pricingData,
  adjustCost,
  costPeriod
) => {
  const clusterData =
    ngClusterData?.data?.actor?.account?.nrql?.results?.[0] || null;

  const awsRegion = clusterData?.['latest.awsRegion'];
  const instanceType = clusterData?.['latest.provider.instanceType'].replace(
    'elasticsearch',
    'search'
  );
  const pricing = pricingData.regions[pricingData.mapping[awsRegion]];

  if (pricing) {
    const discoveredPrices = [];

    Object.keys(pricing).forEach(key => {
      const data = pricing[key];
      const priceInstanceType = data?.['Instance Type'];
      if (priceInstanceType === instanceType) {
        discoveredPrices.push(data);
      }
    });

    if (discoveredPrices.length > 0) {
      const firstPrice = discoveredPrices[0];
      const hourRate = firstPrice.price;
      const periodCost = adjustCost(costPeriod, hourRate);

      const messages = [
        `Type: ${instanceType}`,
        `Region: ${awsRegion}`,
        `Cost Period: ${costPeriod.label}`,
        `Hourly Rate: ${hourRate}`,
        `Total Cost: ${periodCost}`,
        `Total cost based on the entire cost period using the hourly rate.`
      ];

      return { periodCost, totalCost: periodCost, messages };
    }
  }

  return null;
};
