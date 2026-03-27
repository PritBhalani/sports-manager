/** Format a value as currency; accepts unknown (e.g. from API row) for use in tables. */
export function formatCurrency(value: unknown): string {
  if (value === undefined || value === null) return "0";
  const n =
    typeof value === "string"
      ? parseFloat(value)
      : typeof value === "number"
        ? value
        : Number.NaN;
  if (Number.isNaN(n)) return "0";

  // Apply currency scaling from login session when available.
  // Session currency example: { rate: 100, fractional: 0, ... }
  let rate = 1;
  let fractional = 0;
  if (typeof window !== "undefined") {
    try {
      // Lazy import to avoid SSR issues.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getAuthSession } = require("@/store/authStore") as {
        getAuthSession?: () => { currency?: { rate?: unknown; fractional?: unknown } };
      };
      const session = getAuthSession?.();
      const r = Number(session?.currency?.rate ?? 1);
      const f = Number(session?.currency?.fractional ?? 0);
      if (Number.isFinite(r) && r > 0) rate = r;
      if (Number.isFinite(f) && f >= 0) fractional = Math.floor(f);
    } catch {
      // ignore if session unavailable
    }
  }

  const scaled = n * rate;
  const digits = Math.max(0, Math.min(6, fractional));
  return scaled.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
