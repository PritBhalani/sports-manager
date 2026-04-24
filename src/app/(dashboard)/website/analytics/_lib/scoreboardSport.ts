import type { MarketByEventRow } from "@/services/position.service";
import type { EventTypeRecord } from "@/services/eventtype.service";

export type ScoreboardSport = "cricket" | "tennis" | "football";

function pickStr(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** Map API event-type name to score widget family. */
export function inferScoreboardSportFromLabel(label: string): ScoreboardSport | null {
  const l = label.toLowerCase();
  if (l.includes("cricket")) return "cricket";
  if (l.includes("tennis")) return "tennis";
  if (l.includes("football") || l.includes("soccer")) return "football";
  return null;
}

function eventTypeLabelForId(
  eventTypeId: string,
  records: EventTypeRecord[],
): string | null {
  const tid = eventTypeId.trim();
  if (!tid || tid === "-1") return null;
  for (const et of records) {
    if (!et || typeof et !== "object") continue;
    const o = et as Record<string, unknown>;
    const id = pickStr(o, ["id", "_id"]);
    if (id !== tid) continue;
    const name = pickStr(o, ["name", "eventTypeName", "sportName"]);
    if (name) return name;
  }
  return null;
}

function firstNestedEventTypeId(row: MarketByEventRow | null): string | null {
  if (!row?.markets?.length) return null;
  for (const m of row.markets) {
    const et = m?.eventType;
    if (et && typeof et === "object" && !Array.isArray(et)) {
      const id = (et as { id?: unknown }).id;
      if (id != null && String(id).trim()) return String(id).trim();
    }
  }
  return null;
}

/**
 * Decide which score embed to use from `eventTypeId` (query) + `/eventtype/geteventtype` list,
 * with fallback to `market.eventType.id` on the loaded event row.
 */
export function resolveScoreboardSport(
  eventTypeId: string,
  eventTypeRecords: EventTypeRecord[],
  eventRow: MarketByEventRow | null,
): ScoreboardSport | null {
  const fromQuery = eventTypeLabelForId(eventTypeId, eventTypeRecords);
  if (fromQuery) {
    const s = inferScoreboardSportFromLabel(fromQuery);
    if (s) return s;
  }
  const nestedId = firstNestedEventTypeId(eventRow);
  if (nestedId) {
    const label = eventTypeLabelForId(nestedId, eventTypeRecords);
    if (label) {
      const s = inferScoreboardSportFromLabel(label);
      if (s) return s;
    }
  }
  return null;
}
