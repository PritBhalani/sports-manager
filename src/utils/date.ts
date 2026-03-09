/** Format a date/time value for display; accepts unknown (e.g. from API row) for use in tables. */
export function formatDateTime(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value !== "number" && typeof value !== "string") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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
