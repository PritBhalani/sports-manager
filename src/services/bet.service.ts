/** README §4 Bet – POST /bet/getlivebets */
import { apiPost } from "./apiClient";
import type { ListParams } from "@/types/api.types";
import type { LiveBetSearchQuery, LiveBetsResponse } from "@/types/bet.types";

/** POST /bet/getlivebets – optional id for user scope */
export async function getLiveBets(
  params: ListParams,
  searchQuery: LiveBetSearchQuery,
  id?: string
): Promise<LiveBetsResponse> {
  return apiPost("/bet/getlivebets", {
    params: { pageSize: 15, ...params },
    searchQuery,
    ...(id ? { id } : {}),
  });
}
