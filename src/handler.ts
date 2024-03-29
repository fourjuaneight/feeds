import {
  addFeedItem,
  queryFeedItems,
  queryFeedsAggregateCount,
  queryMangaFeedChapters,
  queryTags,
  searchFeedItems,
  updateFeedItem,
} from './hasura';
import { version } from '../package.json';

import { Feed, RequestPayload, TableAggregate } from './typings.d';

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
  try {
    // determine which type and method to use
    switch (true) {
      case payload.type === 'Tags': {
        const selectedTagList = payload.tagList as string;
        const tags = await queryTags(selectedTagList);

        return new Response(
          JSON.stringify({
            tags,
            table: payload.table,
            location: payload.type,
            version,
          }),
          responseInit
        );
      }
      case payload.type === 'Insert': {
        const insertData = payload.data as Feed;
        const saved = await addFeedItem(payload.table, insertData);

        return new Response(
          JSON.stringify({
            saved,
            table: payload.table,
            location: payload.type,
            version,
          }),
          responseInit
        );
        break;
      }
      case payload.type === 'Update': {
        const updateData = payload.data as Feed;
        const updated = await updateFeedItem(
          payload.table,
          updateData.id as string,
          updateData
        );

        return new Response(
          JSON.stringify({
            updated,
            table: payload.table,
            location: payload.type,
            version,
          }),
          responseInit
        );
        break;
      }
      case payload.type === 'Search': {
        const searchPattern = payload.query as string;
        const searchItems = await searchFeedItems(payload.table, searchPattern);

        return new Response(
          JSON.stringify({
            items: searchItems,
            table: payload.table,
            version,
          }),
          responseInit
        );
        break;
      }
      case payload.type === 'Count': {
        const queryResults = await queryFeedsAggregateCount(
          payload.table as TableAggregate
        );

        return new Response(
          JSON.stringify({
            count: queryResults,
            table: payload.table,
            version,
          }),
          responseInit
        );
      }
      case payload.type === 'Chapters': {
        const queryItems = await queryMangaFeedChapters(payload.query);

        return new Response(
          JSON.stringify({
            items: queryItems,
            table: payload.table,
            version,
          }),
          responseInit
        );
      }
      default: {
        const queryItems = await queryFeedItems(payload.table);

        return new Response(
          JSON.stringify({
            items: queryItems,
            table: payload.table,
            version,
          }),
          responseInit
        );
      }
    }
  } catch (error) {
    console.log('handleAction', error);
    return new Response(
      JSON.stringify({
        error,
        table: payload.table,
        location: payload.type,
        version,
      }),
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
    return new Response(JSON.stringify({ version }), {
      status: 405,
      statusText: 'Method Not Allowed',
    });
  }

  // content-type check (required)
  if (!request.headers.has('content-type')) {
    return new Response(
      JSON.stringify({
        error: "Please provide 'content-type' header.",
        version,
      }),
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
          JSON.stringify({ error: "Missing 'type' parameter.", version }),
          badReqBody
        );
      case payload.type === 'Tags' && !payload.tagList:
        return new Response(
          JSON.stringify({ error: "Missing 'tagList' parameter.", version }),
          badReqBody
        );
      case payload.type !== 'Tags' && !payload.table:
        return new Response(
          JSON.stringify({ error: "Missing 'table' parameter.", version }),
          badReqBody
        );
      case payload.type === 'Insert' && missingData(payload.data):
        return new Response(
          JSON.stringify({ error: 'Missing Insert data.', version }),
          badReqBody
        );
      case payload.type === 'Update' && missingData(payload.data):
        return new Response(
          JSON.stringify({ error: 'Missing Update data.', version }),
          badReqBody
        );
      case payload.type === 'Search' && !payload.query:
        return new Response(
          JSON.stringify({ error: 'Missing Search query.', version }),
          badReqBody
        );
      case payload.type === 'Chapters' && !payload.query:
        return new Response(
          JSON.stringify({ error: 'Missing Search query.', version }),
          badReqBody
        );
      case payload.type === 'Count' && !payload.table:
        return new Response(
          JSON.stringify({ error: "Missing 'table' parameter.", version }),
          badReqBody
        );
      case !key:
        return new Response(
          JSON.stringify({ error: "Missing 'key' header.", version }),
          noAuthReqBody
        );
      case key !== AUTH_KEY:
        return new Response(
          JSON.stringify({
            error: "You're not authorized to access this API.",
            version,
          }),
          noAuthReqBody
        );
      default: {
        return handleAction(payload);
      }
    }
  }

  // default to bad content-type
  return new Response(JSON.stringify({ version }), {
    status: 415,
    statusText: 'Unsupported Media Type',
  });
};
