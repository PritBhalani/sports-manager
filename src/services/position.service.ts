/** README §7 Position – all GET, path params only */
import { apiGet } from "./apiClient";
import type { PositionRecord } from "@/types/position.types";

/** Row from GET /position/getmarketbyeventtypeid/{eventTypeId}/{allFlag} — `data[]` */
export type MarketByEventRow = {
  id?: string;
  name?: string;
  raceName?: string;
  openDate?: string;
  competitionName?: string;
  totalBets?: number;
  totalStake?: number;
  markets?: MarketByEventMarket[];
  [key: string]: unknown;
};

export type MarketByEventRunner = {
  id?: string;
  name?: string;
  sourceId?: string;
  runnerMetadata?: string;
};

export type MarketByEventMarketRunnerEntry = {
  runner?: MarketByEventRunner;
  status?: number;
};

export type MarketByEventMarket = {
  id?: string;
  name?: string;
  marketType?: string;
  inPlay?: boolean;
  marketRunner?: MarketByEventMarketRunnerEntry[];
  eventType?: { id?: string };
  [key: string]: unknown;
};

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

/**
 * GET /position/getmarketbyeventtypeid/{eventTypeId}/{allFlag}
 * Use eventTypeId `-1` with allFlag `true` for all sports (per backend contract).
 */
export async function getMarketByEventTypeId(
  eventTypeId: string,
  allFlag: boolean = true,
): Promise<MarketByEventRow[]> {
  const flagStr = allFlag ? "true" : "false";
  const path = `/position/getmarketbyeventtypeid/${encodeURIComponent(eventTypeId)}/${flagStr}`;
  const raw = await apiGet<
    | MarketByEventRow[]
    | { data?: MarketByEventRow[]; success?: boolean }
  >(path);
  if (Array.isArray(raw)) return raw;
  const data = (raw as { data?: MarketByEventRow[] }).data;
  return Array.isArray(data) ? data : [];
}
