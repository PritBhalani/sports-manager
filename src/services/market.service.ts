/** README §9 Manage Market + Market metadata */
import { apiGet, apiPost, type ApiMutationOptions } from "./apiClient";
import type { MarketLockRecord } from "@/types/market.types";

export interface MarketRunner {
  status: number;
  displayOrder: number;
  runner: {
    id: string;
    sourceId: number;
    name: string;
  };
}

export interface SidebarMarketRecord {
  id: number;
  marketRuleId: string;
  name: string;
  startTime: string;
  marketStatus: number;
  temporaryStatus: number;
  inPlay: boolean;
  sportNodeType: number;
  betDelay: number;
  bettingType: number;
  priceLadderType: number;
  eventTypeId: string;
  marketRunner: MarketRunner[];
  marketType: string;
  group: number;
  syncData: boolean;
  maxBet: number;
  maxProfit: number;
  maxLiability: number;
  displayOrder: number;
  version: number;
  minPrice?: number;
  maxPrice?: number;
  allowLimit?: boolean;
  allowLimitMarket?: boolean;
}

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

/** GET /market/getmarketbyeventid/{eventId} — get markets for an event. Auth: Session. */
export async function getMarketByEventId(eventId: string): Promise<SidebarMarketRecord[]> {
  const res = await apiGet<{ data?: SidebarMarketRecord[] }>(
    `/market/getmarketbyeventid/${eventId}`
  );
  return res?.data ?? [];
}
