/* eslint-disable camelcase */
export interface Feed {
  category: string;
  id?: string;
  rss: string;
  title: string;
  url: string;
}

export interface HasuraInsertResp {
  [key: string]: {
    title: string;
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
    [key: string]: Feed[];
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

export interface RequestPayload {
  key: string;
  type: string;
  table: string;
  tagList?: string;
  data?: Feed;
  query?: string;
}
