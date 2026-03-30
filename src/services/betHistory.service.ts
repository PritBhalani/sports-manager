/** README §5 Bet History */
import { apiGet, apiPost } from "./apiClient";
import type { ListParams, ApiListResponse } from "@/types/api.types";
import type { BetHistorySearchQuery, BetHistoryResponse } from "@/types/bet.types";

const BETHISTORY = "/bethistory";

/** POST /bethistory/getbethistory */
export async function getBetHistory(
  params: ListParams,
  searchQuery: BetHistorySearchQuery,
  id?: string
): Promise<BetHistoryResponse> {
  return apiPost(`${BETHISTORY}/getbethistory`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    ...(id ? { id } : {}),
  });
}

/** GET /bethistory/getuseractivity/{userId} — user bet activity summary (README §5) */
export async function getUserActivity(userId: string): Promise<Record<string, unknown>> {
  return apiGet(`${BETHISTORY}/getuseractivity/${encodeURIComponent(userId)}`);
}

/** Row from POST /bethistory/getplbymarket — `data.result[]` */
export type PlByMarketRow = {
  roundId: number;
  marketId: string;
  marketName: string;
  competitionName?: string;
  eventName: string;
  marketTime?: string;
  settleTime?: string;
  winner?: string;
  win: number;
  commission: number;
  pnl: number;
  stake: number;
};

export type GetPlByMarketResponse = {
  items: PlByMarketRow[];
  total: number;
  pageIndex: number;
  pageSize: number;
};

/** POST /bethistory/getplbymarket — Body: searchQuery (fromDate, toDate, eventTypeId), params */
export async function getPlByMarket(
  params: ListParams,
  searchQuery: { fromDate?: string; toDate?: string; eventTypeId?: string }
): Promise<GetPlByMarketResponse> {
  type Envelope = {
    data?: {
      result?: PlByMarketRow[];
      total?: number;
      pageIndex?: number;
      pageSize?: number;
    };
  };
  const res = await apiPost<Envelope>(`${BETHISTORY}/getplbymarket`, {
    params: {
      pageSize: params.pageSize ?? 15,
      groupBy: params.groupBy ?? "",
      page: params.page ?? 1,
      orderBy: params.orderBy ?? "",
      orderByDesc: params.orderByDesc ?? true,
      ...params,
    },
    searchQuery,
  });

  const inner = res?.data;
  return {
    items: inner?.result ?? [],
    total: inner?.total ?? 0,
    pageIndex: inner?.pageIndex ?? params.page ?? 1,
    pageSize: inner?.pageSize ?? params.pageSize ?? 15,
  };
}

/** GET /bethistory/getplbymarketdetails/{marketId}/ or /{marketId}/{parentId} — P&L details for a market (README §5) */
export async function getPlByMarketDetails(
  marketId: string,
  parentId?: string
): Promise<Record<string, unknown>[]> {
  const path = parentId
    ? `${BETHISTORY}/getplbymarketdetails/${encodeURIComponent(marketId)}/${encodeURIComponent(parentId)}`
    : `${BETHISTORY}/getplbymarketdetails/${encodeURIComponent(marketId)}/`;
  const res = await apiGet<Record<string, unknown>[] | { data?: Record<string, unknown>[] }>(path);
  return Array.isArray(res) ? res : res?.data ?? [];
}

/** POST /bethistory/getbethistorybymarketid — bet history for a market. Body: searchQuery (marketId, status), params */
export async function getBetHistoryByMarketId(
  params: ListParams,
  searchQuery: { marketId: string; status?: string }
): Promise<{
  items: Record<string, unknown>[];
  total: number;
  pageIndex: number;
  pageSize: number;
}> {
  type Envelope = {
    data?: {
      result?: Record<string, unknown>[];
      total?: number;
      pageIndex?: number;
      pageSize?: number;
    };
  };
  const res = await apiPost<Envelope>(`${BETHISTORY}/getbethistorybymarketid`, {
    params: {
      pageSize: params.pageSize ?? 50,
      groupBy: params.groupBy ?? "",
      page: params.page ?? 1,
      orderBy: params.orderBy ?? "",
      orderByDesc: params.orderByDesc ?? false,
      ...params,
    },
    searchQuery: {
      marketId: searchQuery.marketId,
      status: searchQuery.status ?? "",
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

/** Row from POST /bethistory/getplbyagent — `data.result[]` */
export type PlByAgentUserPl = {
  user: {
    id: string;
    userCode: string;
    username: string;
  };
  netWin: number;
  win: number;
  comm: number;
};

export type PlByAgentRound = {
  roundId: number;
  marketId: string;
  marketName: string;
  eventName: string;
  eventTypeName?: string;
  competitionName?: string;
  winner?: string;
  marketTime?: string;
  settleTime: string;
  userPls: PlByAgentUserPl[];
};

export type GetPlByAgentResponse = {
  items: PlByAgentRound[];
  total: number;
  pageIndex: number;
  pageSize: number;
};

/** POST /bethistory/getplbyagent — P&L by agent. Body: searchQuery (fromDate, toDate), params, optional id (parentId) */
export async function getPlByAgent(
  params: ListParams,
  searchQuery: { fromDate?: string; toDate?: string },
  parentId?: string
): Promise<GetPlByAgentResponse> {
  type Envelope = {
    data?:
      | PlByAgentRound[]
      | {
          result?: PlByAgentRound[];
          total?: number;
          pageIndex?: number;
          pageSize?: number;
        };
  };
  const res = await apiPost<Envelope>(`${BETHISTORY}/getplbyagent`, {
    params: {
      pageSize: params.pageSize ?? 50,
      groupBy: params.groupBy ?? "",
      page: params.page ?? 1,
      orderBy: params.orderBy ?? "",
      orderByDesc: params.orderByDesc ?? false,
      ...params,
    },
    searchQuery,
    ...(parentId ? { id: parentId } : {}),
  });
  const inner = res?.data;
  if (Array.isArray(inner)) {
    return {
      items: inner,
      total: inner.length,
      pageIndex: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
    };
  }
  return {
    items: inner?.result ?? [],
    total: inner?.total ?? 0,
    pageIndex: inner?.pageIndex ?? params.page ?? 1,
    pageSize: inner?.pageSize ?? params.pageSize ?? 50,
  };
}

/** Row from POST /bethistory/getdownlinesummary — `data.result[]` */
export type DownlineSummaryUser = {
  id: string;
  userCode: string;
  username: string;
  userType?: number;
};

export type DownlineSummaryRow = {
  user: DownlineSummaryUser;
  pnl?: number;
  to: number;
  win: number;
  comm: number;
  roundId?: number;
};

export type GetDownlineSummaryResponse = {
  items: DownlineSummaryRow[];
  total: number;
  pageIndex: number;
  pageSize: number;
};

/** POST /bethistory/getdownlinesummary — Body: searchQuery (fromDate, toDate), params, optional id (parent) */
export async function getDownlineSummary(
  params: ListParams,
  searchQuery: { fromDate?: string; toDate?: string },
  parentId?: string
): Promise<GetDownlineSummaryResponse> {
  type Envelope = {
    data?: {
      result?: DownlineSummaryRow[];
      total?: number;
      pageIndex?: number;
      pageSize?: number;
    };
  };
  const res = await apiPost<Envelope>(`${BETHISTORY}/getdownlinesummary`, {
    params: {
      pageSize: params.pageSize ?? 50,
      groupBy: params.groupBy ?? "",
      page: params.page ?? 1,
      orderBy: params.orderBy ?? "",
      orderByDesc: params.orderByDesc ?? false,
      ...params,
    },
    searchQuery,
    ...(parentId ? { id: parentId } : {}),
  });
  const inner = res?.data;
  return {
    items: inner?.result ?? [],
    total: inner?.total ?? 0,
    pageIndex: inner?.pageIndex ?? params.page ?? 1,
    pageSize: inner?.pageSize ?? params.pageSize ?? 50,
  };
}

/** Row from POST /bethistory/getdownlinesummarydetails — `data[]` */
export type DownlineSummaryDetailRow = {
  eventTypeName?: string;
  netPl?: number;
  commission?: number;
  stake?: number;
};

/** POST /bethistory/getdownlinesummarydetails — Body: id (userId), searchQuery (fromDate, toDate) */
export async function getDownlineSummaryDetails(
  userId: string,
  searchQuery: { fromDate?: string; toDate?: string }
): Promise<DownlineSummaryDetailRow[]> {
  type Envelope = { data?: DownlineSummaryDetailRow[] };
  const res = await apiPost<Envelope>(`${BETHISTORY}/getdownlinesummarydetails`, {
    id: userId,
    searchQuery,
  });
  const list = res?.data;
  return Array.isArray(list) ? list : [];
}
