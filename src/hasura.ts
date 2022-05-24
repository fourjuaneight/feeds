import {
  Feed,
  HasuraErrors,
  HasuraInsertResp,
  HasuraQueryResp,
  HasuraUpdateResp,
} from './typings.d';

/**
 * Add feed entry to Hasura.
 * @function
 * @async
 *
 * @param {string} table
 * @param {Feed} item data to upload
 * @returns {Promise<string>}
 */
export const addFeedItem = async (
  table: string,
  item: Feed
): Promise<string> => {
  const query = `
    mutation {
      insert_feeds_${table}_one(object: {
        category: "${item.category}",
        rss: "${item.rss}",
        title: "${item.title}",
        url: "${item.url}"
       }) {
        title
      }
    }
  `;

  try {
    const request = await fetch(`${HASURA_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hasura-Admin-Secret': `${HASURA_ADMIN_SECRET}`,
      },
      body: JSON.stringify({ query }),
    });
    const response: HasuraInsertResp | HasuraErrors = await request.json();

    if (response.errors) {
      const { errors } = response as HasuraErrors;

      console.log('addFeedItem', errors);
      throw `Adding record to Hasura - Feeds - ${table}: \n ${errors
        .map(err => `${err.extensions.path}: ${err.message}`)
        .join('\n')} \n ${query}`;
    }

    return (response as HasuraInsertResp)[`insert_feeds_${table}_one`].title;
  } catch (error) {
    console.log('addFeedItem', error);
    throw `Adding record to Hasura - Feeds - ${table}: \n ${error}`;
  }
};

/**
 * Update feed entry to Hasura.
 * @function
 * @async
 *
 * @param {string} table
 * @param {string} id item id
 * @param {Feed} item data to update
 * @returns {Promise<string>}
 */
export const updateFeedItem = async (
  table: string,
  id: string,
  item: Feed
): Promise<string> => {
  const query = `
    mutation {
      update_feeds_${table}(
        where: {id: {_eq: "${id}"}},
        _set: {
          category: "${item.category}",
          rss: "${item.rss}",
          title: "${item.title}",
          url: "${item.url}"
        }
      ) {
        returning {
          title
        }
      }
    }
  `;

  try {
    const request = await fetch(`${HASURA_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hasura-Admin-Secret': `${HASURA_ADMIN_SECRET}`,
      },
      body: JSON.stringify({ query }),
    });
    const response: HasuraUpdateResp | HasuraErrors = await request.json();

    if (response.errors) {
      const { errors } = response as HasuraErrors;

      console.log('updateFeedItem', errors);
      throw `Updating record to Hasura - Feeds - ${table}: \n ${errors
        .map(err => `${err.extensions.path}: ${err.message}`)
        .join('\n')} \n ${query}`;
    }

    return (response as HasuraUpdateResp)[`update_feeds_${table}`].returning[0]
      .title;
  } catch (error) {
    console.log('updateFeedItem', error);
    throw `Updating record to Hasura - Feeds - ${table}: \n ${error}`;
  }
};

/**
 * Get feed entries from Hasura.
 * @function
 * @async
 *
 * @param {string} table
 * @returns {Promise<Feed[]>}
 */
export const queryFeedItems = async (table: string): Promise<Feed[]> => {
  const query = `
    {
      feeds_${table}(order_by: {title: asc}) {
        category
        rss
        title
        url
      }
    }
  `;

  try {
    const request = await fetch(`${HASURA_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hasura-Admin-Secret': `${HASURA_ADMIN_SECRET}`,
      },
      body: JSON.stringify({ query }),
    });
    const response: HasuraQueryResp | HasuraErrors = await request.json();

    if (response.errors) {
      const { errors } = response as HasuraErrors;

      console.log('queryFeedItems', errors);
      throw `Querying records from Hasura - Feeds - ${table}: \n ${errors
        .map(err => `${err.extensions.path}: ${err.message}`)
        .join('\n')} \n ${query}`;
    }

    return (response as HasuraQueryResp).data[`feeds_${table}`];
  } catch (error) {
    console.log('queryFeedItems', error);
    throw `Querying records from Hasura - Feeds - ${table}: \n ${error}`;
  }
};

/**
 * Search feed entries from Hasura.
 * @function
 * @async
 *
 * @param {string} table
 * @param {string} pattern feed item title
 * @returns {Promise<Feed[]>}
 */
export const searchFeedItems = async (
  table: string,
  pattern: string
): Promise<Feed[]> => {
  const query = `
    {
      feeds_${table}(
        order_by: {title: asc},
        where: {title: {_iregex: ".*${pattern}.*"}}
      ) {
        category
        rss
        title
        url
      }
    }
  `;

  try {
    const request = await fetch(`${HASURA_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hasura-Admin-Secret': `${HASURA_ADMIN_SECRET}`,
      },
      body: JSON.stringify({ query }),
    });
    const response: HasuraQueryResp | HasuraErrors = await request.json();

    if (response.errors) {
      const { errors } = response as HasuraErrors;

      console.log('searchFeedItems', errors);
      throw `Searching records from Hasura - Feeds - ${table}: \n ${errors
        .map(err => `${err.extensions.path}: ${err.message}`)
        .join('\n')} \n ${query}`;
    }

    return (response as HasuraQueryResp).data[`feeds_${table}`];
  } catch (error) {
    console.log('searchFeedItems', error);
    throw `Searching records from Hasura - Feeds - ${table}: \n ${error}`;
  }
};
