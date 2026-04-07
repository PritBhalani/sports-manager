import { formatCurrency } from "@/utils/formatCurrency";
import type { BonusTransactionRow, DwTransactionRow } from "@/services/account.service";

/** B2C summary grid “Date” column (UTC calendar). */
export function formatB2cSummaryGridDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Title line: DD-MM-YYYY from summary `row.date`. */
export function formatB2cReportTitleDate(dateRaw: string): string {
  const day = String(dateRaw ?? "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [y, m, d] = day.split("-");
    return `${d}-${m}-${y}`;
  }
  return formatB2cSummaryGridDate(dateRaw);
}

/** Timestamp in Asia/Kolkata as DD-MM-YYYY HH:mm:ss (24h). */
export function formatDwDateTimeIST(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export function dwDescriptionLine(row: DwTransactionRow): string {
  const n = String(row.narration ?? "").trim();
  const r = String(row.remarks ?? "").trim();
  if (n && r) return `${n} (${r})`;
  return n || r || "—";
}

export function bonusRowAsRecord(line: BonusTransactionRow): Record<string, unknown> {
  return line as Record<string, unknown>;
}

export function pickBonusNumber(
  o: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = parseFloat(String(v).replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

export function formatBonusTurnoverPair(
  line: BonusTransactionRow,
  leftKeys: string[],
  rightKeys: string[],
): string {
  const o = bonusRowAsRecord(line);
  const a = pickBonusNumber(o, leftKeys);
  const b = pickBonusNumber(o, rightKeys);
  if (a == null && b == null) return "—";
  return `${a != null ? formatCurrency(a) : "—"} / ${b != null ? formatCurrency(b) : "—"}`;
}

export const BONUS_CTO_KEYS = ["cto", "creditTurnover", "CTO", "cTO", "creditTO"];
export const BONUS_RTO_KEYS = ["rto", "realTurnover", "RTO", "realTO", "requiredTurnover"];
export const BONUS_CWTO_KEYS = ["cwto", "creditWageringTurnover", "CWTO", "creditWTO"];
export const BONUS_RWTO_KEYS = ["rwto", "realWageringTurnover", "RWTO", "realWTO"];

export function bonusCodeCell(line: BonusTransactionRow): string {
  const o = bonusRowAsRecord(line);
  const direct = o.bonusCode ?? o.code ?? o.BonusCode ?? o.bonusCodeName;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const nested = o.bonus;
  if (nested && typeof nested === "object") {
    const bo = nested as Record<string, unknown>;
    const c = bo.code ?? bo.bonusCode;
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "—";
}

export function bonusAmountCell(line: BonusTransactionRow): string {
  const o = bonusRowAsRecord(line);
  const n = pickBonusNumber(o, [
    "amount",
    "balance",
    "bonusAmount",
    "redeemAmount",
    "activatedAmount",
    "value",
  ]);
  return formatCurrency(n ?? 0);
}

export function bonusExpireIso(line: BonusTransactionRow): string | undefined {
  const o = bonusRowAsRecord(line);
  for (const k of [
    "expireOn",
    "expiringOn",
    "expiredOn",
    "expiringDate",
    "expireDate",
    "expiryDate",
    "bonusExpireOn",
  ]) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}
