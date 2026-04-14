/** README §4 Bet – POST /bet/getlivebets */
import { apiPost } from "./apiClient";
import type { ListParams } from "@/types/api.types";
import type { LiveBetSearchQuery } from "@/types/bet.types";

export type LiveBetRow = Record<string, unknown>;

export type GetLiveBetsResponse = {
  items: LiveBetRow[];
  total: number;
  pageIndex: number;
  pageSize: number;
};

/** POST /bet/getlivebets – optional id for user scope */
export async function getLiveBets(
  params: ListParams,
  searchQuery: LiveBetSearchQuery,
  id?: string
): Promise<GetLiveBetsResponse> {
  type Envelope = {
    data?: {
      result?: LiveBetRow[];
      total?: number;
      pageIndex?: number;
      pageSize?: number;
    };
  };
  const res = await apiPost<Envelope>("/bet/getlivebets", {
    params: {
      pageSize: params.pageSize ?? 50,
      groupBy: params.groupBy ?? "",
      page: params.page ?? 1,
      orderBy: params.orderBy ?? "",
      orderByDesc: params.orderByDesc ?? false,
      ...params,
    },
    searchQuery,
    ...(id ? { id } : {}),
  });
  const inner = res?.data;
  return {
    items: inner?.result ?? [],
    total: inner?.total ?? 0,
    pageIndex: inner?.pageIndex ?? params.page ?? 1,
    pageSize: inner?.pageSize ?? params.pageSize ?? 50,
  };
}

/** POST /bet/getlivebetsbyeventid — live bets for one event; optional marketId narrows to one market */
export async function getLiveBetsByEventId(
  params: ListParams,
  searchQuery: LiveBetSearchQuery & { eventId: string },
  id?: string
): Promise<GetLiveBetsResponse> {
  type Envelope = {
    data?: {
      result?: LiveBetRow[];
      total?: number;
      pageIndex?: number;
      pageSize?: number;
    };
  };
  const res = await apiPost<Envelope>("/bet/getlivebetsbyeventid", {
    params: {
      pageSize: params.pageSize ?? 50,
      groupBy: params.groupBy ?? "",
      page: params.page ?? 1,
      orderBy: params.orderBy ?? "",
      orderByDesc: params.orderByDesc ?? false,
      ...params,
    },
    searchQuery,
    ...(id ? { id } : {}),
  });
  const inner = res?.data;
  return {
    items: inner?.result ?? [],
    total: inner?.total ?? 0,
    pageIndex: inner?.pageIndex ?? params.page ?? 1,
    pageSize: inner?.pageSize ?? params.pageSize ?? 50,
  };
}
