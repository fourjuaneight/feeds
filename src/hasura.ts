import {
  Feed,
  HasuraErrors,
  HasuraInsertResp,
  HasuraQueryAggregateResp,
  HasuraQueryResp,
  HasuraQueryTagsResp,
  HasuraUpdateResp,
  RecordColumnAggregateCount,
  SocialFeed,
  TableAggregate,
} from './typings.d';

const getQuery = (table: string, searchPat?: string) => {
  const column = table === 'reddit' || table === 'twitter' ? 'name' : 'title';
  const where = searchPat
    ? `, where: {${column}: {_iregex: ".*${searchPat}.*"}}`
    : '';

  switch (table) {
    case 'reddit':
      return `
        {
          feeds_reddit(order_by: {name: asc}${where}) {
            name
            description
            url
            id
          }
        }
      `;
    case 'twitter':
      return `
        {
          feeds_twitter(order_by: {name: asc}${where}) {
            name
            username
            description
            list
            url
            id
          }
        }
      `;
    default:
      return `
        {
          feeds_${table}(order_by: {title: asc}${where}) {
            category
            rss
            title
            url
            id
          }
        }
      `;
  }
};

const objToQueryString = (obj: { [key: string]: any }) =>
  Object.keys(obj).map(key => {
    const value = obj[key];
    const fmtValue =
      typeof value === 'string'
        ? `"${value
            .replace(/\\/g, '')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')}"`
        : Array.isArray(value)
        ? `"{${value.join(',')}}"`
        : value;

    return `${key}: ${fmtValue}`;
  });

const countUnique = (iterable: string[]) =>
  iterable.reduce((acc: RecordColumnAggregateCount, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

const countUniqueSorted = (iterable: string[]) =>
  // sort descending by count
  Object.entries(countUnique(iterable))
    .sort((a, b) => b[1] - a[1])
    .reduce(
      (acc: RecordColumnAggregateCount, [key, val]) =>
        ({ ...acc, [key]: val } as RecordColumnAggregateCount),
      {}
    );

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
 * Get aggregated count of feeds column from Hasura.
 * @function
 * @async
 *
 * @param {string} table
 * @returns {Promise<RecordColumnAggregateCount>}
 */
export const queryFeedsAggregateCount = async (
  table: TableAggregate
): Promise<RecordColumnAggregateCount> => {
  const query = `
    {
      feeds_${table}(order_by: {title: asc}) {
        category
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
    const response: any = await request.json();

    if (response.errors) {
      const { errors } = response as HasuraErrors;

      throw `(queryFeedsAggregateCount) - ${table}: \n ${errors
        .map(err => `${err.extensions.path}: ${err.message}`)
        .join('\n')} \n ${query}`;
    }

    const data = (response as HasuraQueryAggregateResp).data[`feeds_${table}`];
    const collection = data.map(item => item.category);

    return countUniqueSorted(collection);
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
 * @returns {Promise<Feed[] | SocialFeed[]>}
 */
export const queryFeedItems = async (
  table: string
): Promise<Feed[] | SocialFeed[]> => {
  const query = getQuery(table);

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
 * @returns {Promise<Feed[] | SocialFeed[]>}
 */
export const searchFeedItems = async (
  table: string,
  pattern: string
): Promise<Feed[] | SocialFeed[]> => {
  const query = getQuery(table, pattern);

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
  const column = table === 'reddit' || table === 'twitter' ? 'name' : 'title';
  const query = `
    mutation {
        insert_feeds_${table}_one(object: { ${objToQueryString(item)} }) {
       }) {
        ${column}
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
  const column = table === 'reddit' || table === 'twitter' ? 'name' : 'title';
  const query = `
    mutation {
      update_feeds_${table}(
        where: {id: {_eq: "${id}"}},
        _set: { ${objToQueryString(item)} }
      ) {
        returning {
          ${column}
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
