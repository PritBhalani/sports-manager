/** Format a value as currency; accepts unknown (e.g. from API row) for use in tables. */
export function formatCurrency(value: unknown): string {
  if (value === undefined || value === null) return "0.00";
  const n = typeof value === "string" ? parseFloat(value) : typeof value === "number" ? value : Number.NaN;
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
