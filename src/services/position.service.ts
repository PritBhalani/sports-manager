/** README §7 Position – all GET, path params only */
import { apiGet } from "./apiClient";
import type { PositionRecord } from "@/types/position.types";

/** GET /position/geteventtypeposition */
export async function getEventTypePosition(): Promise<PositionRecord[]> {
  const res = await apiGet<PositionRecord[] | { data?: PositionRecord[] }>(
    "/position/geteventtypeposition"
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}

/** GET /position/geteventpositionbyid/{sportId} */
export async function getEventPositionById(
  sportId: string
): Promise<PositionRecord[]> {
  const res = await apiGet<PositionRecord[] | { data?: PositionRecord[] }>(
    `/position/geteventpositionbyid/${encodeURIComponent(sportId)}`
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}

/** GET /position/getmarketpositionbyid/{eventId} */
export async function getMarketPositionByEventId(
  eventId: string
): Promise<PositionRecord[]> {
  const res = await apiGet<PositionRecord[] | { data?: PositionRecord[] }>(
    `/position/getmarketpositionbyid/${encodeURIComponent(eventId)}`
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}

/** GET /position/getmarketpositionbymarketid/{marketId} */
export async function getMarketPositionByMarketId(
  marketId: string
): Promise<PositionRecord[]> {
  const res = await apiGet<PositionRecord[] | { data?: PositionRecord[] }>(
    `/position/getmarketpositionbymarketid/${encodeURIComponent(marketId)}`
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}

/** GET /position/getfancyuserposition/{marketId}/false — fancy user position for market (README §7) */
export async function getFancyUserPosition(marketId: string): Promise<PositionRecord[]> {
  const res = await apiGet<PositionRecord[] | { data?: PositionRecord[] }>(
    `/position/getfancyuserposition/${encodeURIComponent(marketId)}/false`
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}
