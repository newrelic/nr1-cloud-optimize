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

  const region =
    event?.headers?.['NR-REGION'] || event?.headers?.['nr-region'] || 'US';
  const nerdGraphUrl = NERDGRAPH_URL[region] || NERDGRAPH_URL.US;

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
    const response = await fetch(nerdGraphUrl, {
      method: 'post',
      body: JSON.stringify({
        query:
          '{\n  actor {\n    user {\n      email\n      id\n    }\n  }\n}\n'
      }),
      headers: {
        'Content-Type': 'application/json',
        'API-Key': nerdGraphKey
      }
    });

    const httpData = await response.json();
    const user = httpData?.data?.actor?.user || null;

    if (!user) {
      const response = {
        statusCode: 403,
        headers: {
          ...BASE_HEADERS
        },
        body: JSON.stringify({
          success: false,
          message: 'invalid api key',
          response: httpData
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
