/** README §11 Dashboard – all GET, no params */
import { apiGet } from "./apiClient";

export async function getTotalMarket(): Promise<{ total?: number; [key: string]: unknown }> {
  return apiGet("/dashboard/gettotalmarket");
}

export async function getUserSummary(): Promise<Record<string, unknown>> {
  return apiGet("/dashboard/getusersummary");
}

export async function getLiveBetTotal(): Promise<{ total?: number; [key: string]: unknown }> {
  return apiGet("/dashboard/getlivebettotal");
}

export async function getRecentProfitLoss(): Promise<Record<string, unknown>[]> {
  const res = await apiGet<Record<string, unknown>[] | { data?: Record<string, unknown>[] }>(
    "/dashboard/getrecentprofitloss"
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}

export async function getBetSummary(): Promise<Record<string, unknown>> {
  return apiGet("/dashboard/getbetsummary");
}

export async function getLiveBetSummary(): Promise<Record<string, unknown>> {
  return apiGet("/dashboard/getlivebetsummary");
}
