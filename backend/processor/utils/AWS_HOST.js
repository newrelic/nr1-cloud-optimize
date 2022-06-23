const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { AWS_LOCATIONS_URL } = require('../constants');

exports.fetchAwsEc2Locations = () => {
  return new Promise(resolve => {
    fetch(AWS_LOCATIONS_URL).then(async response => {
      try {
        const locationData = await response.json();
        resolve({ locationData });
      } catch (e) {
        console.log('failed @ fetchAwsEc2Locations', e); // eslint-disable-line no-console
        resolve(null);
      }
    });
  });
};

exports.fetchAwsEc2RegionPricing = (region, locations) => {
  return new Promise(resolve => {
    const regionLabel = Object.keys(locations).find(
      l => locations[l].code === region
    );

    if (regionLabel) {
      const URL = `https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/ec2/USD/current/ec2-ondemand-without-sec-sel/${regionLabel}/Linux/index.json`;

      fetch(URL).then(async response => {
        try {
          const pricingDataUnsorted = await response.json();
          const pricingData = Object.keys(
            pricingDataUnsorted?.regions?.[regionLabel] || {}
          )
            .map(
              instance => pricingDataUnsorted?.regions?.[regionLabel][instance]
            )
            .sort((a, b) => a.price - b.price);

          resolve({ pricingData, region, regionLabel });
        } catch (e) {
          console.log('failed @ fetchAwsEc2RegionPricing', e, region); // eslint-disable-line no-console
          resolve(null);
        }
      });
    } else {
      resolve(null);
    }
  });
};
