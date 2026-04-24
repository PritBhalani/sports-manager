/** README §9 Manage Market + Market metadata */
import { apiGet, apiPost, type ApiMutationOptions } from "./apiClient";
import type { MarketLockRecord } from "@/types/market.types";

export type MarketTypeMapping = {
  id: string;
  displayName: string;
  marketTypeCode: string;
};

/** GET /market/getAllmarkettypemapping — market type mapping list. Auth: Session. */
export async function getAllMarketTypeMapping(): Promise<MarketTypeMapping[]> {
  const res = await apiGet<MarketTypeMapping[] | { data?: MarketTypeMapping[] }>(
    "/market/getAllmarkettypemapping",
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}

/** GET /managemarket/getmarketlockstatus/{sportId} */
export async function getMarketLockStatus(
  sportId: string
): Promise<MarketLockRecord> {
  return apiGet(
    `/managemarket/getmarketlockstatus/${encodeURIComponent(sportId)}`
  );
}

/** POST /managemarket/updatemarketlockstatus — `nodeType` e.g. 4 = event. */
export async function updateMarketLockStatus(
  body: {
    nodeId: string;
    isLock: boolean;
    nodeType: number;
  },
  options?: ApiMutationOptions,
): Promise<unknown> {
  return apiPost("/managemarket/updatemarketlockstatus", body, {
    showSuccessToast: true,
    successMessage: "Updated successfully.",
    ...options,
  });
}
