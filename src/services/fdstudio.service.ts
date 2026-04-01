import { apiPost } from "./apiClient";
import type { ListParams } from "@/types/api.types";

const FDSTUDIO = "/fdstudio";

export type FdProfitLossUser = {
  id?: string;
  userCode?: string;
  username?: string;
  userType?: number;
  [key: string]: unknown;
};

/** Row from POST /fdstudio/getprofitloss — `data.result[]` */
export type FdProfitLossRow = {
  user?: FdProfitLossUser;
  roundId?: string;
  tableName?: string;
  provider?: number | string;
  createdOn?: string;
  from?: string;
  to?: string;
  win: number;
};

export type GetFdProfitLossResponse = {
  items: FdProfitLossRow[];
  total: number;
  pageIndex: number;
  pageSize: number;
};

export type FdProfitLossSearchQuery = {
  fromDate: string;
  toDate: string;
  /** Required for per-user round P&L (e.g. player detail). */
  userId?: string;
};

/**
 * POST /fdstudio/getprofitloss
 * Pass `id` (and usually `searchQuery.userId`) for player-scoped round list; omit for org-wide report.
 */
export async function getFdProfitLoss(
  params: ListParams,
  searchQuery: FdProfitLossSearchQuery,
  id?: string,
): Promise<GetFdProfitLossResponse> {
  type Envelope = {
    data?: {
      result?: FdProfitLossRow[];
      total?: number;
      pageIndex?: number;
      pageSize?: number;
    };
  };
  const mergedParams = {
    pageSize: 50,
    groupBy: "",
    page: 1,
    orderBy: "",
    orderByDesc: false,
    ...params,
  };
  const body: Record<string, unknown> = {
    searchQuery,
    params: mergedParams,
  };
  const trimmedId = id?.trim();
  if (trimmedId) {
    body.id = trimmedId;
  }

  const res = await apiPost<Envelope>(`${FDSTUDIO}/getprofitloss`, body);
  const inner = res?.data;
  return {
    items: inner?.result ?? [],
    total: inner?.total ?? 0,
    pageIndex: inner?.pageIndex ?? mergedParams.page ?? 1,
    pageSize: inner?.pageSize ?? mergedParams.pageSize ?? 50,
  };
}

/** Row from POST /fdstudio/getrunningexposure — `data.result[]` */
export type FdRunningExposureRow = {
  name?: string;
  tableName?: string;
  roundId?: number;
  provider?: string;
  credit?: number;
  debit?: number;
  isPl?: boolean;
  createdOn?: string;
  [key: string]: unknown;
};

export type GetFdRunningExposureResponse = {
  items: FdRunningExposureRow[];
  total: number;
  pageIndex: number;
  pageSize: number;
};

/** POST /fdstudio/getrunningexposure — running exposure list (no searchQuery) */
export async function getFdRunningExposure(
  params: ListParams,
): Promise<GetFdRunningExposureResponse> {
  type Envelope = {
    data?: {
      result?: FdRunningExposureRow[];
      total?: number;
      pageIndex?: number;
      pageSize?: number;
    };
  };
  const res = await apiPost<Envelope>(`${FDSTUDIO}/getrunningexposure`, {
    params: {
      pageSize: params.pageSize ?? 50,
      groupBy: params.groupBy ?? "",
      page: params.page ?? 1,
      orderBy: params.orderBy ?? "",
      orderByDesc: params.orderByDesc ?? false,
      ...params,
    },
  });
  const inner = res?.data;
  return {
    items: inner?.result ?? [],
    total: inner?.total ?? 0,
    pageIndex: inner?.pageIndex ?? params.page ?? 1,
    pageSize: inner?.pageSize ?? params.pageSize ?? 50,
  };
}
