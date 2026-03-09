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

/** POST /bethistory/getplbymarket — P&L aggregated by market (README §5). Body: searchQuery (fromDate, toDate, eventTypeId), params */
export async function getPlByMarket(
  params: ListParams,
  searchQuery: { fromDate?: string; toDate?: string; eventTypeId?: string }
): Promise<ApiListResponse<Record<string, unknown>>> {
  return apiPost(`${BETHISTORY}/getplbymarket`, {
    params: { pageSize: 15, ...params },
    searchQuery,
  });
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
): Promise<ApiListResponse<Record<string, unknown>>> {
  return apiPost(`${BETHISTORY}/getbethistorybymarketid`, {
    params: { pageSize: 15, ...params },
    searchQuery,
  });
}

/** POST /bethistory/getplbyagent — P&L by agent (downline). Body: searchQuery (fromDate, toDate), params, optional id (parentId) */
export async function getPlByAgent(
  params: ListParams,
  searchQuery: { fromDate?: string; toDate?: string },
  parentId?: string
): Promise<ApiListResponse<Record<string, unknown>>> {
  return apiPost(`${BETHISTORY}/getplbyagent`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    ...(parentId ? { id: parentId } : {}),
  });
}

/** POST /bethistory/getdownlinesummary — downline P&L summary. Body: searchQuery (fromDate, toDate), params, optional id (parentId) */
export async function getDownlineSummary(
  params: ListParams,
  searchQuery: { fromDate?: string; toDate?: string },
  parentId?: string
): Promise<ApiListResponse<Record<string, unknown>>> {
  return apiPost(`${BETHISTORY}/getdownlinesummary`, {
    params: { pageSize: 15, ...params },
    searchQuery,
    ...(parentId ? { id: parentId } : {}),
  });
}

/** POST /bethistory/getdownlinesummarydetails — downline summary for one user. Body: id (userId), searchQuery (fromDate, toDate) */
export async function getDownlineSummaryDetails(
  userId: string,
  searchQuery: { fromDate?: string; toDate?: string }
): Promise<ApiListResponse<Record<string, unknown>>> {
  return apiPost(`${BETHISTORY}/getdownlinesummarydetails`, {
    id: userId,
    searchQuery,
  });
}
