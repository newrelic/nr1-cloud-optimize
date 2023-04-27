const pino = require('pino')();

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({ region: 'ap-southeast-2' });

const bucket = 'nr1-cloud-optimize';

module.exports.writeToS3 = (product, key, data) => {
  pino.info({
    event: `cloud-optimize-${product}-pricing-collector:writing-to-s3:${key}`
  });

  const params = {
    Body: JSON.stringify(data).toString('binary'),
    Bucket: bucket,
    Key: `${key}.json`,
    ACL: 'public-read',
    ContentType: 'application/json'
  };

  const command = new PutObjectCommand(params);

  return client.send(command);
};
