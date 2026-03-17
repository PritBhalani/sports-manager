/** README §11 Dashboard – all GET, no params */
import { apiGet } from "./apiClient";

type ApiEnvelope<T> = {
  success?: boolean;
  messages?: string[];
  data?: T;
};

export type TotalMarketSummary = {
  totalMarkets?: number;
  inplayMarkets?: number;
};

export type UserSummary = {
  totalUser?: number;
  liveUser?: number;
};

export type LiveBetTotalSummary = {
  stake?: number;
  totalBets?: number;
};

export type BetSummaryRow = {
  eventTypeId?: string;
  eventTypeName?: string;
  pl?: number;
  stake?: number;
};

export type LiveBetSummaryRow = {
  eventTypeId?: string;
  eventTypeName?: string;
  stake?: number;
  totalBets?: number;
};

async function unwrapDashboardData<T>(path: string): Promise<T> {
  const res = await apiGet<ApiEnvelope<T> | T>(path);

  if (res && typeof res === "object" && "data" in res) {
    return (res as ApiEnvelope<T>).data as T;
  }

  return res as T;
}

export async function getTotalMarket(): Promise<TotalMarketSummary> {
  return unwrapDashboardData<TotalMarketSummary>("/dashboard/gettotalmarket");
}

export async function getUserSummary(): Promise<UserSummary> {
  return unwrapDashboardData<UserSummary>("/dashboard/getusersummary");
}

export async function getLiveBetTotal(): Promise<LiveBetTotalSummary> {
  return unwrapDashboardData<LiveBetTotalSummary>("/dashboard/getlivebettotal");
}

export async function getRecentProfitLoss(): Promise<Record<string, unknown>[]> {
  const res = await unwrapDashboardData<Record<string, unknown>[]>(
    "/dashboard/getrecentprofitloss",
  );
  return Array.isArray(res) ? res : [];
}

export async function getBetSummary(): Promise<BetSummaryRow[]> {
  const res = await unwrapDashboardData<BetSummaryRow[]>("/dashboard/getbetsummary");
  return Array.isArray(res) ? res : [];
}

export async function getLiveBetSummary(): Promise<LiveBetSummaryRow[]> {
  const res = await unwrapDashboardData<LiveBetSummaryRow[]>(
    "/dashboard/getlivebetsummary",
  );
  return Array.isArray(res) ? res : [];
}
