/**
 * Tailwind text color for signed amounts in tables:
 * positive → success, negative → error, zero / non-finite → default foreground.
 *
 * Accepts the same kinds of values as currency formatters (numbers, numeric strings,
 * strings with grouping commas or Unicode minus) so the sign matches what users see.
 */
function toFiniteNumber(value: unknown): number {
  if (value === undefined || value === null) return NaN;
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") {
    const t = value.trim().replace(/\u2212/g, "-").replace(/,/g, "");
    if (t === "") return NaN;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function signedAmountTextClass(value: unknown): string {
  const n = toFiniteNumber(value);
  if (!Number.isFinite(n)) return "text-foreground";
  if (n > 0) return "text-success";
  if (n < 0) return "text-error";
  return "text-foreground";
}
