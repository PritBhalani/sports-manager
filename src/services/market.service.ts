/** README §9 Manage Market */
import { apiGet, apiPost } from "./apiClient";
import type { MarketLockRecord } from "@/types/market.types";

/** GET /managemarket/getmarketlockstatus/{sportId} */
export async function getMarketLockStatus(
  sportId: string
): Promise<MarketLockRecord> {
  return apiGet(
    `/managemarket/getmarketlockstatus/${encodeURIComponent(sportId)}`
  );
}

/** POST /managemarket/updatemarketlockstatus */
export async function updateMarketLockStatus(body: {
  nodeId: string;
  isLock: boolean;
  nodeType: number;
}): Promise<unknown> {
  return apiPost("/managemarket/updatemarketlockstatus", body);
}
