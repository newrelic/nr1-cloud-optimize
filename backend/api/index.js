/* eslint-disable require-atomic-updates */
// https://github.com/node-fetch/node-fetch#commonjs
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const pathHandlers = {
  optimize: { POST: require('./optimize') }
};

const { NERDGRAPH_URL, BASE_HEADERS } = require('./constants');

module.exports.router = async (event, context, callback) => {
  const path =
    event?.pathParameters?.path || event?.pathParameters?.proxy || '/';

  const nerdGraphKey =
    event.headers?.['NR-API-KEY'] || event.headers?.['nr-api-key'];

  if (!nerdGraphKey) {
    const response = {
      statusCode: 400,
      headers: {
        ...BASE_HEADERS
      },
      body: JSON.stringify({
        success: false,
        message: 'NR-API-Key header missing'
      })
    };
    callback(null, response);
  } else {
    // validate api key
    // check whether US or EU since as can't determine from the nerdpack side
    const responses = [
      fetch(NERDGRAPH_URL.US, {
        method: 'post',
        body: JSON.stringify({
          query:
            '{\n  actor {\n    user {\n      email\n      id\n    }\n  }\n}\n'
        }),
        headers: {
          'Content-Type': 'application/json',
          'API-Key': nerdGraphKey
        }
      }),
      fetch(NERDGRAPH_URL.EU, {
        method: 'post',
        body: JSON.stringify({
          query:
            '{\n  actor {\n    user {\n      email\n      id\n    }\n  }\n}\n'
        }),
        headers: {
          'Content-Type': 'application/json',
          'API-Key': nerdGraphKey
        }
      })
    ];

    const responseData = await Promise.allSettled(responses);
    const responseValues = await Promise.allSettled(
      responseData.map(d => d.value.json())
    );

    let user = null;

    if (responseValues[0].status === 'fulfilled') {
      // US REGION
      event.headers['NR-REGION'] = 'US';
      event.headers['nr-region'] = 'US';
      user = responseValues[0]?.value?.data?.actor?.user || null;
    } else if (responseValues[1].status === 'fulfilled') {
      // EU Region
      event.headers['NR-REGION'] = 'EU';
      event.headers['nr-region'] = 'EU';
      user = responseValues[1]?.value?.data?.actor?.user || null;
    } else {
      // unable to determine region or validate token
      const response = {
        statusCode: 403,
        headers: {
          ...BASE_HEADERS
        },
        body: JSON.stringify({
          success: false,
          message: 'unable to determine region or validate token'
        })
      };
      callback(null, response);
    }

    if (!user) {
      const response = {
        statusCode: 403,
        headers: {
          ...BASE_HEADERS
        },
        body: JSON.stringify({
          success: false,
          message: 'invalid api key',
          response: user
        })
      };
      callback(null, response);
    }
  }

  if (path in pathHandlers && event?.httpMethod in pathHandlers[path]) {
    try {
      const body = JSON.parse(event.body);
      return pathHandlers[path][event.httpMethod](
        {
          body,
          headers: event.headers,
          key: nerdGraphKey
        },
        context,
        callback
      );
    } catch (e) {
      const response = {
        statusCode: 400,
        headers: {
          ...BASE_HEADERS
        },
        body: JSON.stringify({
          success: false,
          message: 'An error occurred',
          err: e,
          pathParams: event.pathParameters,
          queryParams: event.queryStringParameters,
          body: event.body
        })
      };
      callback(null, response);
    }
  } else {
    const response = {
      statusCode: 405,
      headers: {
        ...BASE_HEADERS
      },
      body: JSON.stringify({
        success: false,
        message: `Invalid HTTP Method: ${event.httpMethod}`,
        pathParams: event.pathParameters,
        queryParams: event.queryStringParameters,
        body: event.body
      })
    };

    callback(null, response);
  }
};
