/* eslint-disable camelcase */
export type TableAggregate = 'podcasts' | 'websites' | 'youtube';

export interface Feed {
  category: string;
  id?: string;
  rss: string;
  title: string;
  url: string;
}

export interface SocialFeed {
  description: string;
  id?: string;
  list?: string;
  name: string;
  username?: string;
  url: string;
}

export interface RecordColumnAggregateCount {
  [key: string]: number;
}

export interface HasuraInsertResp {
  data: {
    [key: string]: {
      title: string;
    };
  };
}

export interface HasuraUpdateResp {
  [key: string]: {
    returning: {
      title: string;
    }[];
  };
}

export interface HasuraQueryResp {
  data: {
    [key: string]: Feed[] | SocialFeed[];
  };
}

export interface HasuraQueryAggregateResp {
  data: {
    [key: string]: {
      [key: string]: string;
    }[];
  };
}

export interface HasuraQueryTagsResp {
  data: {
    meta_categories: { name: string }[];
  };
}

export interface HasuraErrors {
  errors: {
    extensions: {
      path: string;
      code: string;
    };
    message: string;
  }[];
}

export type Types = 'Tags' | 'Count' | 'Query' | 'Search' | 'Insert' | 'Update';

export type Tables = 'podcasts' | 'reddit' | 'twitter' | 'websites' | 'youtube';

export interface RequestPayload {
  type: Types;
  table: Tables;
  tagList?: string;
  data?: Feed;
  query?: string;
  countColumn?: string;
}
