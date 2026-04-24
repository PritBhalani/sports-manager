/**
 * Format a date/time for tables: `DD/MM/YY (HH:MM:SS)` in local time, 24h clock.
 * Accepts unknown (e.g. from API rows).
 */
export function formatDateTime(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value !== "number" && typeof value !== "string") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dD = String(date.getDate()).padStart(2, "0");
  const dM = String(date.getMonth() + 1).padStart(2, "0");
  const dY = String(date.getFullYear() % 100).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${dD}/${dM}/${dY} ${h}:${mi}:${s}`;
}

/** Time between last update and original create (updatedOn − createdOn). */
export function formatUpdateMinusCreateGap(
  createdIso: unknown,
  updatedIso: unknown
): string {
  if (createdIso == null || updatedIso == null) return "—";
  const createdMs = Date.parse(String(createdIso));
  const updatedMs = Date.parse(String(updatedIso));
  if (Number.isNaN(createdMs) || Number.isNaN(updatedMs)) return "—";
  let diff = Math.max(0, Math.floor((updatedMs - createdMs) / 1000));
  const days = Math.floor(diff / 86400);
  diff -= days * 86400;
  const hours = Math.floor(diff / 3600);
  diff -= hours * 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff - minutes * 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

/** Return current timestamp as string (ms since epoch) for API */
export function timestampMs(): string {
  return String(Date.now());
}

/** ISO UTC date string for API searchQuery fromDate/toDate */
export function toISOUTC(d: Date): string {
  return d.toISOString();
}

/** Default date range: today start/end UTC */
export function todayRangeUTC(): { fromDate: string; toDate: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { fromDate: toISOUTC(start), toDate: toISOUTC(end) };
}

/** Format YYYY-MM-DD inputs to API ISO range (start of day / end of day UTC). */
export function dateRangeToISO(
  fromDate: string,
  toDate: string
): { fromDate: string; toDate: string } {
  return {
    fromDate: new Date(fromDate + "T00:00:00.000Z").toISOString(),
    toDate: new Date(toDate + "T23:59:59.999Z").toISOString(),
  };
}
