import type { MarketByEventRow } from "@/services/position.service";

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

/**
 * Id for third-party score widgets (e.g. Cricfeed `data-score-mid`).
 * Prefers the event’s **source** id from the position API when present.
 */
export function getEventScoreMidForEmbed(
  eventRow: MarketByEventRow | null,
  routeEventId: string,
): string {
  const fallback = routeEventId.trim();
  if (!eventRow) return fallback;

  const r = eventRow as Record<string, unknown>;
  const fromRow = pickStr(r, [
    "sourceId",
    "sourceID",
    "eventSourceId",
    "externalId",
    "providerEventId",
    "betfairEventId",
  ]);

  return fromRow || fallback;
}

function nestedEventFromMarket(m: unknown): Record<string, unknown> | null {
  if (!m || typeof m !== "object" || Array.isArray(m)) return null;
  const ev = (m as Record<string, unknown>).event;
  if (!ev || typeof ev !== "object" || Array.isArray(ev)) return null;
  return ev as Record<string, unknown>;
}

/**
 * Exchange / provider event id for one247-style `{"type":"subscribe","match": "…"}`.
 * Does **not** fall back to internal DB `eventId` — omit subscribe until `sourceId` is known.
 */
export function getEventSourceIdForWsSubscribe(
  eventRow: MarketByEventRow | null,
): string {
  if (!eventRow) return "";

  const r = eventRow as Record<string, unknown>;
  const fromRow = pickStr(r, [
    "sourceId",
    "sourceID",
    "eventSourceId",
    "externalId",
    "providerEventId",
    "betfairEventId",
  ]);
  if (fromRow) return fromRow;

  for (const m of eventRow.markets ?? []) {
    const ev = nestedEventFromMarket(m);
    if (!ev) continue;
    const sid = pickStr(ev, ["sourceId", "sourceID"]);
    if (sid) return sid;
  }

  return "";
}
