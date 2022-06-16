import {
  Feed,
  HasuraErrors,
  HasuraInsertResp,
  HasuraQueryResp,
  HasuraQueryTagsResp,
  HasuraUpdateResp,
} from './typings.d';

/**
 * Get feed tags from Hasura.
 * @function
 * @async
 *
 * @param {string} table table name
 * @returns {Promise<RecordData[]>}
 */
export const queryTags = async (table: string): Promise<string[]> => {
  const query = `
    {
      meta_categories(
        order_by: {name: asc},
        where: {schema: {_eq: "feeds"}, table: {_eq: "${table}"}}
      ) {
        name
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
    const response: HasuraQueryTagsResp | HasuraErrors = await request.json();

    if (response.errors) {
      const { errors } = response as HasuraErrors;

      throw `(queryTags) - ${table}: \n ${errors
        .map(err => `${err.extensions.path}: ${err.message}`)
        .join('\n')} \n ${query}`;
    }

    const tags = (response as HasuraQueryTagsResp).data.meta_categories.map(
      tag => tag.name
    );

    return tags;
  } catch (error) {
    console.log(error);
    throw error;
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
        id
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

      throw `(queryFeedItems) - ${table}: \n ${errors
        .map(err => `${err.extensions.path}: ${err.message}`)
        .join('\n')} \n ${query}`;
    }

    return (response as HasuraQueryResp).data[`feeds_${table}`];
  } catch (error) {
    console.log(error);
    throw error;
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
        id
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

      throw `(searchFeedItems) - ${table}: \n ${errors
        .map(err => `${err.extensions.path}: ${err.message}`)
        .join('\n')} \n ${query}`;
    }

    return (response as HasuraQueryResp).data[`feeds_${table}`];
  } catch (error) {
    console.log(error);
    throw error;
  }
};

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
    const existing = await searchFeedItems(table, item.title);

    if (existing.length !== 0) {
      throw `(addFeedItem): Feed already exists.`;
    }

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

      throw `(addFeedItem) - ${table}: \n ${errors
        .map(err => `${err.extensions.path}: ${err.message}`)
        .join('\n')} \n ${query}`;
    }

    return (response as HasuraInsertResp).data[`insert_feeds_${table}_one`]
      .title;
  } catch (error) {
    console.log(error);
    throw error;
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

      throw `(updateFeedItem) - ${table}: \n ${errors
        .map(err => `${err.extensions.path}: ${err.message}`)
        .join('\n')} \n ${query}`;
    }

    return (response as HasuraUpdateResp)[`update_feeds_${table}`].returning[0]
      .title;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
