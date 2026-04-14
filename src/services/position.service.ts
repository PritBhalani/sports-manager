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
  /** 2 = ball running (one247 `tbody.ball`). */
  temporaryStatus?: number;
  /** 3 = suspended, 4 = closed (backend-specific). */
  marketStatus?: number;
  bettingType?: number;
  marketRunner?: MarketByEventMarketRunnerEntry[];
  eventType?: { id?: string };
  [key: string]: unknown;
};

/**
 * Merge `markets[]` from two GET /position/getmarketbyeventtypeid rows for the same event.
 * Some backends return a fuller catalog when `allFlag` is false vs true.
 */
export function mergeMarketCatalogForEvent(
  primary: MarketByEventRow | null | undefined,
  secondary: MarketByEventRow | null | undefined,
): MarketByEventRow | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary ?? null;
  if (!secondary) return primary;
  const byId = new Map<string, MarketByEventMarket>();
  const add = (m: MarketByEventMarket) => {
    const id = m?.id != null ? String(m.id).trim() : "";
    if (id) {
      if (!byId.has(id)) byId.set(id, m);
      return;
    }
    const k = `__noid_${byId.size}_${String(m.name ?? "")}`;
    byId.set(k, m);
  };
  for (const m of primary.markets ?? []) add(m);
  for (const m of secondary.markets ?? []) add(m);
  return { ...primary, markets: [...byId.values()] };
}

/** Append/replace markets on an event row by market `id` (deduped). */
export function mergeMarketsIntoEvent(
  event: MarketByEventRow,
  extra: MarketByEventMarket[],
): MarketByEventRow {
  const byId = new Map<string, MarketByEventMarket>();
  const add = (m: MarketByEventMarket) => {
    const id = m?.id != null ? String(m.id).trim() : "";
    if (id) {
      byId.set(id, m);
      return;
    }
    const k = `__noid_${byId.size}_${String(m.name ?? "")}`;
    byId.set(k, m);
  };
  for (const m of event.markets ?? []) add(m);
  for (const m of extra) add(m);
  return { ...event, markets: [...byId.values()] };
}

/**
 * GET /position/getmarketpositionbymarketid/{marketId}
 * Returns full market catalogue fields (Match Odds, runners, marketType) — `data` may be object or array.
 */
export async function getMarketCatalogByMarketId(
  marketId: string,
): Promise<MarketByEventMarket | null> {
  const raw = await apiGet<
    | { data?: MarketByEventMarket | MarketByEventMarket[]; success?: boolean }
    | MarketByEventMarket
  >(`/position/getmarketpositionbymarketid/${encodeURIComponent(marketId)}`);
  if (!raw || typeof raw !== "object") return null;
  if ("data" in raw && raw.data !== undefined) {
    const d = raw.data;
    if (Array.isArray(d)) return (d[0] as MarketByEventMarket | undefined) ?? null;
    return d as MarketByEventMarket;
  }
  if ("id" in raw && ("marketRunner" in raw || "name" in raw)) {
    return raw as MarketByEventMarket;
  }
  return null;
}

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
