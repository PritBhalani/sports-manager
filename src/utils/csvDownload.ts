/**
 * Client-side CSV download for the current table page (UTF-8 with BOM for Excel).
 */

export function csvEscapeCell(raw: string): string {
  const s = String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function cellToCsv(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return csvEscapeCell(String(value));
}

export function buildCsvContent(
  header: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const lines = [
    header.map(cellToCsv).join(","),
    ...rows.map((r) => r.map(cellToCsv).join(",")),
  ];
  return lines.join("\r\n");
}

export function downloadCsv(
  filename: string,
  header: string[],
  rows: (string | number | boolean | null | undefined)[][],
): void {
  const BOM = "\uFEFF";
  const body = buildCsvContent(header, rows);
  const blob = new Blob([BOM + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
