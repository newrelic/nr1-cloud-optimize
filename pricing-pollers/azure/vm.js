const pino = require('pino')();
const async = require('async');

const product = 'virtual-machines';

const regionsURL =
  'https://azure.microsoft.com/api/v2/pricing/calculator/regions/';

const detailsURL = os =>
  `https://azure.microsoft.com/api/v3/pricing/virtual-machines/page/details/${os}/?showLowPriorityOffers=false`;

const baseURL =
  'https://azure.microsoft.com/api/v3/pricing/virtual-machines/page';
const operatingSystems = ['windows', 'linux'];

const { writeToS3 } = require('./utils');

const run = async () => {
  // fetch vm attributes
  const vmDetailPromises = operatingSystems.map(os => fetch(detailsURL(os)));
  const vmDetailsResp = await Promise.all(vmDetailPromises);
  const vmDetailsData = await Promise.all(vmDetailsResp.map(p => p.json()));
  vmDetailsData[0] = vmDetailsData[0].attributesByOffer;
  vmDetailsData[1] = vmDetailsData[1].attributesByOffer;

  // fetch latest regions
  const regionResponse = await fetch(regionsURL);
  const regionData = await regionResponse.json();
  const productsByRegion = {};

  // get details for each region
  const q = async.queue((task, callback) => {
    const regionKey = task.displayName.replace(/ /g, '').toLowerCase();
    if (!productsByRegion[regionKey]) {
      productsByRegion[regionKey] = [];
    }
    const url = `${baseURL}/${task.os}/${task.slug}`;

    fetch(url).then(async resp => {
      const json = await resp.json();
      Object.keys(json).forEach(key => {
        const details = vmDetailsData[task.os === 'linux' ? 1 : 0][key];
        const data = {
          category: details.category,
          type: key,
          onDemandPrice: json[key].perhour,
          spotPrice: [],
          cpusPerVm: details.cores,
          memPerVm: details.ram,
          attributes: {
            series: details.series,
            nameLocKey: details.nameLocKey,
            instanceName: details.instanceName,
            tier: details.tier,
            diskSize: details.diskSize,
            type: details.type,
            isVcpu: details.isVcpu
          }
        };

        if (json[key].perhourspot) {
          data.spotPrice.push({
            zone: task.slug,
            price: json[key].perhourspot
          });
        }

        productsByRegion[regionKey].push(data);
      });

      callback();
    });
  }, 5);

  const regionJSON = [];

  // each location can have multiple regions
  regionData.forEach(rd => {
    const { regions } = rd;

    regions.forEach(region => {
      regionJSON.push({ id: region.slug, name: region.displayName });

      q.push([
        { ...region, os: 'windows' },
        { ...region, os: 'linux' }
      ]);
    });
  });

  await q.drain();

  // write region JSON
  const regionJsonKey = `azure/regions`;
  await writeToS3(product, regionJsonKey, regionJSON);

  // write region data and instance data
  const regionWritePromises = Object.keys(productsByRegion).map(key =>
    writeToS3(product, `azure/compute/pricing/${key}`, {
      products: productsByRegion[key]
    })
  );

  await Promise.all(regionWritePromises);
};

// eslint-disable-next-line
module.exports.handler = (event, context, callback) => {
  pino.info({ event: `cloud-optimize-${product}-pricing-collector:start` });

  run().then(() => {
    pino.info({
      event: `cloud-optimize-${product}-pricing-collector:finished`
    });
  });
};
