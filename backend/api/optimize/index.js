const { v4: uuidv4, validate } = require('uuid');
const AWS = require('aws-sdk');
// eslint-disable-line import/no-extraneous-dependencies
const lambda = new AWS.Lambda();

const { NERDGRAPH_URL, BASE_HEADERS } = require('../constants');

module.exports = (event, context, cb) => {
  const { body, headers } = event;
  const nerdGraphUrl = NERDGRAPH_URL[headers?.['NR-REGION'] || 'US'];

  const errors = [];

  if (
    !body.workloadGuids ||
    !Array.isArray(body.workloadGuids) ||
    !(body?.workloadGuids || []).length > 0
  ) {
    errors.push('array of workloadGuids missing');
  }

  if (!body.nerdpackUUID) {
    errors.push('nerdpackUUID missing');
  } else if (!validate(body.nerdpackUUID)) {
    errors.push('nerdpackUUID invalid');
  }

  if (!body.accountId) {
    errors.push('accountId missing');
  } else if (isNaN(body.accountId)) {
    errors.push('accountId should be an integer');
  }

  if (errors.length > 0) {
    cb(null, {
      statusCode: 400,
      headers: { ...BASE_HEADERS },
      body: JSON.stringify({
        success: false,
        errors,
        msg: 'failed'
      })
    });
  } else {
    const jobId = uuidv4();
    event.jobId = jobId;
    event.nerdGraphUrl = nerdGraphUrl;

    const params = {
      FunctionName: `optimizer-${process.env.STAGE}-optimize-processor`,
      ClientContext: 'STRING_VALUE',
      InvocationType: 'Event',
      LogType: 'None',
      Payload: JSON.stringify(event)
    };

    lambda.invoke(params, function(err, data) {
      // eslint-disable-next-line no-console
      if (err) console.log(err, err.stack);
      // eslint-disable-next-line no-console
      else console.log(data);
    });

    cb(null, {
      statusCode: 200,
      headers: { ...BASE_HEADERS },
      body: JSON.stringify({
        success: true,
        jobId,
        msg: 'optimization job sent'
      })
    });
  }
};
