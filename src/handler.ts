import {
  addFeedItem,
  queryFeedItems,
  queryTags,
  searchFeedItems,
  updateFeedItem,
} from './hasura';

import { RequestPayload, Feed } from './typings.d';

// default responses
const responseInit = {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
  },
};
const badReqBody = {
  status: 400,
  statusText: 'Bad Request',
  ...responseInit,
};
const errReqBody = {
  status: 500,
  statusText: 'Internal Error',
  ...responseInit,
};
const noAuthReqBody = {
  status: 401,
  statusText: 'Unauthorized',
  ...responseInit,
};

const missingData = (data: Feed | undefined): boolean => {
  if (data) {
    const typedData = data as Feed;
    const cleanData = Object.keys(typedData)
      .reduce(
        (acc, key) => [...acc, { key, value: typedData[key] }],
        [] as { key: string; value: string }[]
      )
      .filter(item => item.key !== 'id');
    const missing = Object.values(cleanData).some(value => value === undefined);

    return missing;
  }

  return true;
};

/**
 * Helper method to determine which type/category to use.
 * @function
 * @async
 *
 * @param payload request payload
 * @returns {Promise<Response>} response
 */
const handleAction = async (payload: RequestPayload): Promise<Response> => {
  const { table, type, tagList } = payload;

  try {
    // determine which type and method to use
    switch (true) {
      case type === 'Tags': {
        const selectedTagList = tagList as string;
        const tags = await queryTags(selectedTagList);

        return new Response(
          JSON.stringify({
            tags,
            table,
            location: type,
          }),
          responseInit
        );
      }
      case type === 'Insert':
        const insertData = payload.data as Feed;
        const saved = await addFeedItem(table, insertData);

        return new Response(
          JSON.stringify({
            saved,
            table,
            location: type,
          }),
          responseInit
        );
        break;
      case type === 'Update':
        const updateData = payload.data as Feed;
        const updated = await updateFeedItem(
          table,
          updateData.id as string,
          updateData
        );

        return new Response(
          JSON.stringify({
            updated,
            table,
            location: type,
          }),
          responseInit
        );
        break;
      case type === 'Search':
        const searchPattern = payload.query as string;
        const searchItems = await searchFeedItems(table, searchPattern);

        return new Response(
          JSON.stringify({
            items: searchItems,
            table,
          }),
          responseInit
        );
        break;
      default: {
        const queryItems = await queryFeedItems(table);

        return new Response(
          JSON.stringify({
            items: queryItems,
            table,
          }),
          responseInit
        );
        break;
      }
    }
  } catch (error) {
    console.log('handleAction', error);
    return new Response(
      JSON.stringify({ error, table, location: type }),
      errReqBody
    );
  }
};

/**
 * Handler method for all requests.
 * @function
 * @async
 *
 * @param {Request} request request object
 * @returns {Promise<Response>} response object
 */
export const handleRequest = async (request: Request): Promise<Response> => {
  // POST requests only
  if (request.method !== 'POST') {
    return new Response(null, {
      status: 405,
      statusText: 'Method Not Allowed',
    });
  }

  // content-type check (required)
  if (!request.headers.has('content-type')) {
    return new Response(
      JSON.stringify({ error: "Please provide 'content-type' header." }),
      badReqBody
    );
  }

  const contentType = request.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    const payload: RequestPayload = await request.json();
    const key = request.headers.get('key');

    // check for required fields
    switch (true) {
      case !payload.type:
        return new Response(
          JSON.stringify({ error: "Missing 'type' parameter." }),
          badReqBody
        );
      case !payload.table:
        return new Response(
          JSON.stringify({ error: "Missing 'table' parameter." }),
          badReqBody
        );
      case payload.type === 'Tags' && !payload.tagList:
        return new Response(
          JSON.stringify({ error: "Missing 'tagList' parameter." }),
          badReqBody
        );
      case payload.type === 'Insert' && missingData(payload.data):
        return new Response(
          JSON.stringify({ error: 'Missing Insert data.' }),
          badReqBody
        );
      case payload.type === 'Update' && missingData(payload.data):
        return new Response(
          JSON.stringify({ error: 'Missing Update data.' }),
          badReqBody
        );
      case payload.type === 'Search' && !payload.query:
        return new Response(
          JSON.stringify({ error: 'Missing Search query.' }),
          badReqBody
        );
      case !key:
        return new Response(
          JSON.stringify({ error: "Missing 'key' header." }),
          noAuthReqBody
        );
      case key !== AUTH_KEY:
        return new Response(
          JSON.stringify({
            error: "You're not authorized to access this API.",
          }),
          noAuthReqBody
        );
      default: {
        return handleAction(payload);
      }
    }
  }

  // default to bad content-type
  return new Response(null, {
    status: 415,
    statusText: 'Unsupported Media Type',
  });
};
