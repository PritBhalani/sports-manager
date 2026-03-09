/** Pagination params used by account and other POST list APIs */
export type ListParams = {
  page?: number;
  pageSize?: number;
  groupBy?: string;
  orderBy?: string;
  orderByDesc?: boolean;
};

/** Standard API list response shape */
export type ApiListResponse<T> = {
  data?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
};
