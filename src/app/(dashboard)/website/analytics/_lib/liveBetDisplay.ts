/**
 * Live bet row display helpers for Website analytics (e.g. `/bet/getlivebetsbyeventid`).
 */
import { formatDateTime } from "@/utils/date";
import { formatOddsPrice } from "./websitePriceBook";

/** Same as table convention: `DD/MM/YY (HH:MM:SS)`. */
export function formatBetCardDateTime(value: unknown): string {
  return formatDateTime(value);
}

export function eventMarketTitle(eventName: string, marketName: string): string {
  const e = eventName.trim();
  const m = marketName.trim();
  if (e && m) return `${e} || ${m}`;
  return e || m || "—";
}

/** Prefer string `id` (Mongo-style) for “BetId” in UI; fall back to numeric `betId`. */
export function liveBetIdDisplay(row: Record<string, unknown>): string {
  const id = row.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (id != null && typeof id !== "object") return String(id);
  const betId = row.betId;
  if (betId != null && betId !== "") return String(betId);
  return "—";
}

export function liveBetStakeForDisplay(row: Record<string, unknown>): unknown {
  const size = row.size;
  if (size !== undefined && size !== null && size !== "") return size;
  const stake = row.stake;
  if (stake !== undefined && stake !== null && stake !== "") return stake;
  return row.sizeMatched;
}

export function liveBetOddsDisplay(row: Record<string, unknown>): string {
  const asFormatted = (v: unknown): string | null => {
    const n = Number(v);
    if (!Number.isFinite(n) || n === 0) return null;
    return formatOddsPrice(n);
  };
  const fromDetails = (): string | null => {
    const details = row.betDetails;
    if (!Array.isArray(details)) return null;
    for (const d of details) {
      const s = asFormatted((d as Record<string, unknown>).price);
      if (s) return s;
    }
    return null;
  };
  return (
    asFormatted(row.price) ??
    asFormatted(row.odds) ??
    asFormatted(row.avgPrice) ??
    fromDetails() ??
    "—"
  );
}

export function liveBetAvgDisplay(row: Record<string, unknown>): string {
  const n = Number(row.avgPrice);
  if (!Number.isFinite(n) || n === 0) return "—";
  return formatOddsPrice(n);
}

export function liveBetTimestamp(row: Record<string, unknown>): unknown {
  const direct =
    row.createdOn ??
    row.createdon ??
    row.createdAt ??
    row.updatedOn ??
    row.date;
  if (direct != null && direct !== "") return direct;
  const details = row.betDetails;
  if (Array.isArray(details) && details[0]) {
    const d0 = details[0] as Record<string, unknown>;
    return d0.createdOn ?? d0.createdon ?? d0.updatedOn;
  }
  return undefined;
}

export function liveBetMemberName(row: Record<string, unknown>): string {
  const user = (row.user ?? {}) as Record<string, unknown>;
  return String(
    user.username ?? user.userCode ?? row.username ?? row.userCode ?? "—",
  );
}

export function liveBetEventAndMarketNames(row: Record<string, unknown>): {
  eventName: string;
  marketName: string;
} {
  const market = (row.market ?? {}) as Record<string, unknown>;
  const event = (market.event ?? {}) as Record<string, unknown>;
  return {
    eventName: String(event.name ?? row.eventName ?? ""),
    marketName: String(market.name ?? row.marketName ?? ""),
  };
}

/** Event id for grouping (must align with `MarketByEventRow.id` on the markets list). */
export function liveBetEventId(row: Record<string, unknown>): string {
  const market = row.market;
  if (market && typeof market === "object" && !Array.isArray(market)) {
    const m = market as Record<string, unknown>;
    const ev = m.event;
    if (ev && typeof ev === "object" && !Array.isArray(ev)) {
      const e = ev as Record<string, unknown>;
      const id = e.id ?? e._id;
      if (id != null && String(id).trim()) return String(id).trim();
    }
    const meid = m.eventId;
    if (meid != null && String(meid).trim()) return String(meid).trim();
  }
  const direct = row.eventId ?? row.event_id ?? row.eventID ?? row.eid;
  if (direct != null && String(direct).trim()) return String(direct).trim();
  return "";
}
