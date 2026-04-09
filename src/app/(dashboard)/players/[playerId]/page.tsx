"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  PageHeader,
  Card,
  Tabs,
} from "@/components";
import {
  getUserActivity,
  getBetHistory,
  getBettingProfitLoss,
  type BettingProfitLossGroup,
  type BettingProfitLossMarketRow,
} from "@/services/betHistory.service";
import {
  getInOutActivity,
  getCasinoActivity,
  getAccountStatement,
  getBonusStatement,
  getReferralBalance,
  getReferralStatement,
  getTransferStatement,
} from "@/services/account.service";
import { getMyReferralMember } from "@/services/user.service";
import { getLoginHistoryById } from "@/services/token.service";
import { getLiveBets } from "@/services/bet.service";
import {
  getFdProfitLoss,
  type FdProfitLossRow,
} from "@/services/fdstudio.service";
import { todayRangeUTC, dateRangeToISO, formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

const PLAYER_DETAIL_TABS = [
  { id: "activity", label: "Activity" },
  { id: "bet-list", label: "Bet List" },
  { id: "betting-pl", label: "Betting P&L" },
  { id: "fd-betting-pl", label: "FD Betting P&L" },
  { id: "account-statement", label: "Account Statement" },
  { id: "bonus-statement", label: "Bonus Statement" },
  { id: "referral-statement", label: "Referral Statement" },
  { id: "transfer-statement", label: "Transfer Statement" },
  { id: "login-history", label: "Login History" },
] as const;

type TabId = (typeof PLAYER_DETAIL_TABS)[number]["id"];
type RangeKey = "day1" | "day3" | "day7" | "day30" | "lifetime";
type Metric = Record<RangeKey, number>;

const FD_PL_PAGE_SIZE = 50;
const STATEMENT_PAGE_SIZE = 50;

function flattenBettingProfitLoss(
  groups: BettingProfitLossGroup[],
): Array<BettingProfitLossMarketRow & { groupEventTypeName?: string }> {
  const out: Array<BettingProfitLossMarketRow & { groupEventTypeName?: string }> = [];
  for (const g of groups) {
    const groupLabel = g.eventTypeName;
    for (const row of g.data ?? []) {
      out.push({
        ...row,
        groupEventTypeName: groupLabel,
        eventTypeName: row.eventTypeName ?? groupLabel,
      });
    }
  }
  return out;
}

function accountStatementDescription(row: Record<string, unknown>): string {
  const parts = [row.narration, row.remarks, row.comment]
    .map((x) => (x != null ? String(x).trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function bonusCellString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v);
    }
  }
  return "—";
}

function bonusCellNumber(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return formatCurrency(n);
  }
  return "—";
}

function bonusIsExpired(row: Record<string, unknown>): string {
  const v = row.isExpired ?? row.expired ?? row.isExpiredBonus;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v === 1 || v === "1" || String(v).toLowerCase() === "true") return "Yes";
  if (v === 0 || v === "0" || String(v).toLowerCase() === "false") return "No";
  return bonusCellString(row, "status");
}

function apiEnvelopeErrorText(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const env = raw as { success?: unknown; messages?: unknown[] };
  if (env.success !== false) return null;
  if (!Array.isArray(env.messages)) return "Referral balance unavailable.";
  const parts = env.messages
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return item;
      if (typeof item === "object" && item && "text" in item) {
        return String((item as { text?: unknown }).text ?? "");
      }
      return "";
    })
    .filter(Boolean);
  return parts.length ? parts.join(", ") : "Referral balance unavailable.";
}

function formatReferralBalanceFromResponse(raw: unknown): string {
  if (raw == null || typeof raw !== "object") return "—";
  const r = raw as Record<string, unknown>;
  const data = r.data;
  if (typeof data === "number" && Number.isFinite(data)) return formatCurrency(data);
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const k of ["balance", "referralBalance", "amount", "total"]) {
      const n = Number(d[k]);
      if (Number.isFinite(n)) return formatCurrency(n);
    }
  }
  return "—";
}

const EMPTY_METRIC: Metric = {
  day1: 0,
  day3: 0,
  day7: 0,
  day30: 0,
  lifetime: 0,
};

/**
 * Player Activity table (`/players/[playerId]`, Activity tab) — normalizes three GET responses into rolling metrics.
 *
 * Endpoints: `bethistory/getuseractivity`, `account/getinoutactivity`, `account/getcasinoactivity`.
 *
 * Why this exists (fixes empty or partial UI when the API still returns data):
 * - Backends use mixed JSON shapes: PascalCase (`User`, `Win`), `{ data: [...] }` vs `{ data: { user } }`,
 *   metrics on the root of `data`, and row arrays for in/out/casino like Account Activity.
 * - Earlier code assumed only `data.user.*` with exact key names and treated in/out arrays like nested objects,
 *   so deposit/withdraw sometimes worked after client-side aggregation but bet/casino stayed zero.
 *
 * What we do here:
 * - `recordGetCI` / `metricFromPath`: case-insensitive property walk.
 * - `activityPayloadRoot`: unwrap `data` whether it is an object or an array.
 * - `toMetric`: scalar → lifetime; objects map Day1/d1/today/lifetime aliases; then legacy day1… keys.
 * - `parseBetActivityFromRoot`: if payload is a row array, aggregate like D/W; else coalesce nested paths + top-level keys.
 * - D/W + casino row loops: `recordGetCI` on date/amount/type and extra field names (createdAt, betDate, stake, …).
 */
function metricHasAny(m: Metric): boolean {
  return (
    m.day1 !== 0 ||
    m.day3 !== 0 ||
    m.day7 !== 0 ||
    m.day30 !== 0 ||
    m.lifetime !== 0
  );
}

/** Case-insensitive property read (common in .NET-style JSON). */
function recordGetCI(obj: Record<string, unknown>, key: string): unknown {
  if (key in obj) return obj[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) return obj[k];
  }
  return undefined;
}

/** Normalize object keys so Day_1 / day1 match the same bucket. */
function normalizeMetricKey(k: string): string {
  return k.replace(/_/g, "").toLowerCase();
}

/** Turn API leaf (number, metric object, or value/amount wrapper) into our five-bucket Metric. */
function toMetric(raw: unknown): Metric {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { ...EMPTY_METRIC, lifetime: raw };
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return { ...EMPTY_METRIC, lifetime: n };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_METRIC };
  }
  const out: Metric = { ...EMPTY_METRIC };
  const obj = raw as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    const nk = normalizeMetricKey(k);
    let slot: RangeKey | null = null;
    if (nk === "day1" || nk === "d1" || nk === "today") slot = "day1";
    else if (nk === "day3" || nk === "d3") slot = "day3";
    else if (nk === "day7" || nk === "d7") slot = "day7";
    else if (nk === "day30" || nk === "d30") slot = "day30";
    else if (
      nk === "lifetime" ||
      nk === "lifetimetotal" ||
      nk === "alltime" ||
      nk === "all"
    )
      slot = "lifetime";
    if (!slot) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) out[slot] = n;
  }
  if (
    !metricHasAny(out) &&
    (recordGetCI(obj, "value") !== undefined || recordGetCI(obj, "amount") !== undefined)
  ) {
    const v = recordGetCI(obj, "value") ?? recordGetCI(obj, "amount");
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return { ...EMPTY_METRIC, lifetime: n };
  }
  if (!metricHasAny(out)) {
    const src = obj as Partial<Record<RangeKey, unknown>>;
    return {
      day1: Number(src.day1 ?? 0),
      day3: Number(src.day3 ?? 0),
      day7: Number(src.day7 ?? 0),
      day30: Number(src.day30 ?? 0),
      lifetime: Number(src.lifetime ?? 0),
    };
  }
  return out;
}

/** Walk `source.key1.key2…` using case-insensitive segment lookup; leaf passed through `toMetric`. */
function metricFromPath(
  source: unknown,
  ...path: string[]
): Metric {
  let cur: unknown = source;
  for (const key of path) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return EMPTY_METRIC;
    cur = recordGetCI(cur as Record<string, unknown>, key);
  }
  return toMetric(cur);
}

/**
 * Unwrap API envelope: `data` object or `data` array (both are used by backends).
 */
function activityPayloadRoot(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  const d = o.data;
  if (Array.isArray(d)) return d;
  if (d != null && typeof d === "object") return d;
  return raw;
}

function firstMetricFromPaths(root: unknown, paths: string[][]): Metric {
  for (const p of paths) {
    const m = metricFromPath(root, ...p);
    if (metricHasAny(m)) return m;
  }
  return paths.length ? metricFromPath(root, ...paths[0]) : EMPTY_METRIC;
}

/** Top-level or shallow keys on the payload (some APIs omit a `user` wrapper). */
function metricFromRootKeys(root: unknown, ...keyHints: string[]): Metric {
  if (!root || typeof root !== "object" || Array.isArray(root)) return EMPTY_METRIC;
  const o = root as Record<string, unknown>;
  for (const hint of keyHints) {
    const v = recordGetCI(o, hint);
    const m = toMetric(v);
    if (metricHasAny(m)) return m;
  }
  return EMPTY_METRIC;
}

/** Return the first metric with any non-zero bucket (nested path vs flat keys). */
function coalesceMetric(...candidates: Metric[]): Metric {
  for (const c of candidates) {
    if (metricHasAny(c)) return c;
  }
  return candidates[0] ?? EMPTY_METRIC;
}

const MS_PER_DAY = 86400000;

function rowNumericField(row: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const v = recordGetCI(row, key);
    if (v === undefined || v === null) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

function rowEventTimeMs(row: Record<string, unknown>): number {
  const rawT =
    recordGetCI(row, "date") ??
    recordGetCI(row, "timestamp") ??
    recordGetCI(row, "createdOn") ??
    recordGetCI(row, "createdAt") ??
    recordGetCI(row, "betDate") ??
    recordGetCI(row, "settleTime");
  if (rawT == null) return NaN;
  const t = new Date(String(rawT)).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/** When `getuseractivity` returns a row list (same envelope style as in/out). */
function aggregateBetActivityRows(rows: Record<string, unknown>[]): {
  win: Metric;
  commission: Metric;
  pnl: Metric;
  turnover: Metric;
} {
  const win: Metric = { ...EMPTY_METRIC };
  const commission: Metric = { ...EMPTY_METRIC };
  const pnl: Metric = { ...EMPTY_METRIC };
  const turnover: Metric = { ...EMPTY_METRIC };
  const now = Date.now();
  const inRollingWindow = (t: number, days: number) => t >= now - days * MS_PER_DAY;

  const addRolling = (target: Metric, amt: number, t: number) => {
    if (!Number.isFinite(amt) || amt === 0) return;
    target.lifetime += amt;
    if (!Number.isFinite(t)) return;
    if (inRollingWindow(t, 30)) target.day30 += amt;
    if (inRollingWindow(t, 7)) target.day7 += amt;
    if (inRollingWindow(t, 3)) target.day3 += amt;
    if (inRollingWindow(t, 1)) target.day1 += amt;
  };

  for (const row of rows) {
    const t = rowEventTimeMs(row);
    const nestedUser = recordGetCI(row, "user");
    const source =
      nestedUser && typeof nestedUser === "object" && !Array.isArray(nestedUser)
        ? (nestedUser as Record<string, unknown>)
        : row;

    addRolling(
      win,
      rowNumericField(source, ["win", "totalWin", "Win", "TotalWin"]),
      t,
    );
    addRolling(
      commission,
      rowNumericField(source, ["comm", "commission", "Comm", "Commission"]),
      t,
    );
    addRolling(
      pnl,
      rowNumericField(source, ["pnl", "Pnl", "profitLoss", "pl", "PL"]),
      t,
    );
    addRolling(
      turnover,
      rowNumericField(source, [
        "to",
        "turnover",
        "totalTurnover",
        "stake",
        "Stake",
      ]),
      t,
    );
  }

  return { win, commission, pnl, turnover };
}

/** Build win/comm/pnl/turnover metrics from getuseractivity payload (object and/or row list). */
function parseBetActivityFromRoot(root: unknown): {
  win: Metric;
  commission: Metric;
  pnl: Metric;
  turnover: Metric;
} {
  if (Array.isArray(root)) {
    return aggregateBetActivityRows(root);
  }
  return {
    win: coalesceMetric(
      firstMetricFromPaths(root, [
        ["user", "win"],
        ["user", "totalWin"],
        ["win"],
        ["totalWin"],
      ]),
      metricFromRootKeys(root, "win", "totalWin", "TotalWin"),
    ),
    commission: coalesceMetric(
      firstMetricFromPaths(root, [
        ["user", "commission"],
        ["user", "comm"],
        ["commission"],
        ["comm"],
      ]),
      metricFromRootKeys(root, "commission", "comm", "Commission", "Comm"),
    ),
    pnl: coalesceMetric(
      firstMetricFromPaths(root, [["user", "pnl"], ["pnl"]]),
      metricFromRootKeys(root, "pnl", "Pnl", "profitLoss", "PL"),
    ),
    turnover: coalesceMetric(
      firstMetricFromPaths(root, [
        ["user", "to"],
        ["user", "turnover"],
        ["user", "totalTurnover"],
        ["to"],
        ["turnover"],
        ["totalTurnover"],
      ]),
      metricFromRootKeys(root, "to", "turnover", "totalTurnover", "stake", "Stake"),
    ),
  };
}

/** Sum in/out rows into rolling windows; row keys via CI (PascalCase / createdAt). */
function aggregateDwRowsIntoMetrics(rows: Record<string, unknown>[]): {
  deposit: Metric;
  withdrawal: Metric;
} {
  const deposit: Metric = { ...EMPTY_METRIC };
  const withdrawal: Metric = { ...EMPTY_METRIC };
  const now = Date.now();

  const inRollingWindow = (t: number, days: number) => t >= now - days * MS_PER_DAY;

  for (const row of rows) {
    const rawT =
      recordGetCI(row, "date") ??
      recordGetCI(row, "timestamp") ??
      recordGetCI(row, "createdOn") ??
      recordGetCI(row, "createdAt");
    const t = rawT ? new Date(String(rawT)).getTime() : NaN;
    if (!Number.isFinite(t)) continue;
    const amt = Number(recordGetCI(row, "amount") ?? recordGetCI(row, "chips") ?? 0);
    if (!Number.isFinite(amt)) continue;

    const typ = String(
      recordGetCI(row, "type") ?? recordGetCI(row, "dwType") ?? "",
    )
      .trim()
      .toUpperCase();
    const isDeposit =
      typ === "D" ||
      typ === "DEPOSIT" ||
      typ.includes("DEPOSIT") ||
      typ.includes("PAYIN");
    const isWithdraw =
      typ === "W" ||
      typ === "WITHDRAW" ||
      typ === "WD" ||
      typ.includes("WITHDRAW") ||
      typ.includes("PAYOUT");
    const target = isDeposit ? deposit : isWithdraw ? withdrawal : null;
    if (!target) continue;

    target.lifetime += amt;
    if (inRollingWindow(t, 30)) target.day30 += amt;
    if (inRollingWindow(t, 7)) target.day7 += amt;
    if (inRollingWindow(t, 3)) target.day3 += amt;
    if (inRollingWindow(t, 1)) target.day1 += amt;
  }
  return { deposit, withdrawal };
}

/** Row array from service → aggregate; else read pre-aggregated metrics from object envelope. */
function parseInOutActivity(raw: unknown): {
  deposit: Metric;
  withdrawal: Metric;
} {
  if (Array.isArray(raw)) {
    return aggregateDwRowsIntoMetrics(raw);
  }
  const root = activityPayloadRoot(raw);
  const dep = metricFromPath(root, "user", "totalDeposit");
  const wd = metricFromPath(root, "user", "totalWithdrawal");
  if (metricHasAny(dep) || metricHasAny(wd)) {
    return { deposit: dep, withdrawal: wd };
  }
  return {
    deposit: metricFromPath(root, "totalDeposit"),
    withdrawal: metricFromPath(root, "totalWithdrawal"),
  };
}

/** Sum casino activity rows; amount may live on stake/turnover/pnl depending on API. */
function aggregateCasinoRowsIntoMetrics(rows: Record<string, unknown>[]): Metric {
  const m: Metric = { ...EMPTY_METRIC };
  const now = Date.now();
  const inRollingWindow = (t: number, days: number) => t >= now - days * MS_PER_DAY;

  for (const row of rows) {
    const rawT =
      recordGetCI(row, "date") ??
      recordGetCI(row, "timestamp") ??
      recordGetCI(row, "createdOn") ??
      recordGetCI(row, "createdAt") ??
      recordGetCI(row, "betDate");
    const t = rawT ? new Date(String(rawT)).getTime() : NaN;
    if (!Number.isFinite(t)) continue;
    const amt = Number(
      recordGetCI(row, "amount") ??
        recordGetCI(row, "chips") ??
        recordGetCI(row, "pnl") ??
        recordGetCI(row, "stake") ??
        recordGetCI(row, "turnover") ??
        0,
    );
    if (!Number.isFinite(amt)) continue;

    m.lifetime += amt;
    if (inRollingWindow(t, 30)) m.day30 += amt;
    if (inRollingWindow(t, 7)) m.day7 += amt;
    if (inRollingWindow(t, 3)) m.day3 += amt;
    if (inRollingWindow(t, 1)) m.day1 += amt;
  }
  return m;
}

/** Row list → rolling sums; object payload → nested pnl / profitLoss metrics. */
function parseCasinoActivity(raw: unknown): Metric {
  if (Array.isArray(raw)) {
    return aggregateCasinoRowsIntoMetrics(raw);
  }
  const root = activityPayloadRoot(raw);
  const userPnl = metricFromPath(root, "user", "pnl");
  if (metricHasAny(userPnl)) return userPnl;
  return firstMetricFromPaths(root, [["pnl"], ["totalPnl"], ["profitLoss"]]);
}

type ActivityRows = {
  win: Metric;
  commission: Metric;
  pnl: Metric;
  turnover: Metric;
  deposit: Metric;
  withdrawal: Metric;
  casino: Metric;
};

function renderMetricValue(metric: Metric, key: RangeKey): string {
  return formatCurrency(metric[key]);
}

export default function PlayerDetailPage() {
  const params = useParams<{ playerId: string }>();
  const playerId = String(params?.playerId ?? "").trim();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>("activity");
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityRows, setActivityRows] = useState<ActivityRows>({
    win: EMPTY_METRIC,
    commission: EMPTY_METRIC,
    pnl: EMPTY_METRIC,
    turnover: EMPTY_METRIC,
    deposit: EMPTY_METRIC,
    withdrawal: EMPTY_METRIC,
    casino: EMPTY_METRIC,
  });
  const [betDateFrom, setBetDateFrom] = useState("");
  const [betDateTo, setBetDateTo] = useState("");
  const [betPeriod, setBetPeriod] = useState<"current" | "past">("current");
  const [betMatchType, setBetMatchType] = useState<"matched" | "unmatched">("matched");
  const [referralMode, setReferralMode] = useState<"users" | "statement">("users");
  const [referralMembers, setReferralMembers] = useState<Record<string, unknown>[]>(
    [],
  );
  const [referralMembersLoading, setReferralMembersLoading] = useState(false);
  const [referralMembersError, setReferralMembersError] = useState<string | null>(
    null,
  );
  const [referralBalanceText, setReferralBalanceText] = useState<string | null>(null);
  const [referralBalanceError, setReferralBalanceError] = useState<string | null>(
    null,
  );
  const [referralStmtRows, setReferralStmtRows] = useState<Record<string, unknown>[]>(
    [],
  );
  const [referralStmtTotal, setReferralStmtTotal] = useState(0);
  const [referralStmtPage, setReferralStmtPage] = useState(1);
  const [referralStmtLoading, setReferralStmtLoading] = useState(false);
  const [referralStmtError, setReferralStmtError] = useState<string | null>(null);
  const [referralStmtRefreshKey, setReferralStmtRefreshKey] = useState(0);
  const [transferStmtRows, setTransferStmtRows] = useState<Record<string, unknown>[]>(
    [],
  );
  const [transferStmtTotal, setTransferStmtTotal] = useState(0);
  const [transferStmtPage, setTransferStmtPage] = useState(1);
  const [transferStmtLoading, setTransferStmtLoading] = useState(false);
  const [transferStmtError, setTransferStmtError] = useState<string | null>(null);
  const [loginHistoryRows, setLoginHistoryRows] = useState<Record<string, unknown>[]>(
    [],
  );
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(false);
  const [loginHistoryError, setLoginHistoryError] = useState<string | null>(null);

  const [betRows, setBetRows] = useState<Record<string, unknown>[]>([]);
  const [betTotal, setBetTotal] = useState(0);
  const [betLoading, setBetLoading] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const [betRefreshKey, setBetRefreshKey] = useState(0);

  const [fdPlRows, setFdPlRows] = useState<FdProfitLossRow[]>([]);
  const [fdPlTotal, setFdPlTotal] = useState(0);
  const [fdPlPage, setFdPlPage] = useState(1);
  const [fdPlLoading, setFdPlLoading] = useState(false);
  const [fdPlError, setFdPlError] = useState<string | null>(null);

  const [bettingPlRows, setBettingPlRows] = useState<
    Array<BettingProfitLossMarketRow & { groupEventTypeName?: string }>
  >([]);
  const [bettingPlLoading, setBettingPlLoading] = useState(false);
  const [bettingPlError, setBettingPlError] = useState<string | null>(null);

  const [acctStmtRows, setAcctStmtRows] = useState<Record<string, unknown>[]>([]);
  const [acctStmtTotal, setAcctStmtTotal] = useState(0);
  const [acctStmtPage, setAcctStmtPage] = useState(1);
  const [acctStmtLoading, setAcctStmtLoading] = useState(false);
  const [acctStmtError, setAcctStmtError] = useState<string | null>(null);

  const [bonusStmtRows, setBonusStmtRows] = useState<Record<string, unknown>[]>([]);
  const [bonusStmtTotal, setBonusStmtTotal] = useState(0);
  const [bonusStmtPage, setBonusStmtPage] = useState(1);
  const [bonusStmtLoading, setBonusStmtLoading] = useState(false);
  const [bonusStmtError, setBonusStmtError] = useState<string | null>(null);

  useEffect(() => {
    if (betDateFrom || betDateTo) return;
    const range = todayRangeUTC();
    setBetDateFrom(range.fromDate.slice(0, 10));
    setBetDateTo(range.toDate.slice(0, 10));
  }, [betDateFrom, betDateTo]);

  const betTypeLabel = (row: Record<string, unknown>) => {
    const side = Number(row.side ?? NaN);
    if (side === 1) return "Back";
    if (side === 2) return "Lay";
    return "—";
  };

  const betDescription = (row: Record<string, unknown>) => {
    const market = (row.market ?? {}) as Record<string, unknown>;
    const event = (market.event ?? {}) as Record<string, unknown>;
    const eventName = String(event.name ?? "");
    const marketName = String(market.name ?? "");
    const runner = String(row.runnerName ?? "");
    const parts = [eventName, marketName, runner].filter((p) => p && p !== "undefined");
    return parts.join(" - ") || "—";
  };

  const loadBetList = useCallback(() => {
    if (!playerId) return;
    if (!betDateFrom || !betDateTo) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(betDateFrom, betDateTo);

    setBetLoading(true);
    setBetError(null);

    const baseParams = {
      pageSize: 50,
      groupBy: "",
      page: 1,
      orderBy: betPeriod === "current" ? "createdon" : "",
      orderByDesc: betPeriod === "current",
    };

    const baseQuery: Record<string, unknown> = {
      fromDate: fromISO,
      toDate: toISO,
      eventTypeId: "",
      marketTypeCode: "",
      eventName: "",
      oddsfrom: "",
      oddsto: "",
      stakefrom: "",
      staketo: "",
    };

    const req =
      betPeriod === "current"
        ? getLiveBets(
            baseParams,
            {
              ...baseQuery,
              status: betMatchType,
            } as any,
            playerId,
          )
        : getBetHistory(baseParams, baseQuery as any, playerId);

    Promise.resolve(req)
      .then((res: any) => {
        setBetRows(Array.isArray(res.items) ? res.items : []);
        setBetTotal(typeof res.total === "number" ? res.total : 0);
      })
      .catch((e: any) => {
        setBetRows([]);
        setBetTotal(0);
        setBetError(e instanceof Error ? e.message : "Failed to load bet list.");
      })
      .finally(() => setBetLoading(false));
  }, [playerId, betDateFrom, betDateTo, betPeriod, betMatchType, betRefreshKey]);

  useEffect(() => {
    if (activeTab !== "bet-list") return;
    loadBetList();
  }, [activeTab, loadBetList]);

  useEffect(() => {
    setFdPlPage(1);
    setAcctStmtPage(1);
    setBonusStmtPage(1);
    setReferralStmtPage(1);
    setTransferStmtPage(1);
  }, [betDateFrom, betDateTo]);

  const loadFdProfitLoss = useCallback(() => {
    if (!playerId || !betDateFrom || !betDateTo) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(betDateFrom, betDateTo);
    setFdPlLoading(true);
    setFdPlError(null);
    getFdProfitLoss(
      {
        pageSize: FD_PL_PAGE_SIZE,
        groupBy: "round",
        page: fdPlPage,
        orderBy: "",
        orderByDesc: false,
      },
      { fromDate: fromISO, toDate: toISO, userId: playerId },
      playerId,
    )
      .then((res) => {
        setFdPlRows(Array.isArray(res.items) ? res.items : []);
        setFdPlTotal(typeof res.total === "number" ? res.total : 0);
      })
      .catch((e) => {
        setFdPlRows([]);
        setFdPlTotal(0);
        setFdPlError(
          e instanceof Error ? e.message : "Failed to load FD betting P&L.",
        );
      })
      .finally(() => setFdPlLoading(false));
  }, [playerId, betDateFrom, betDateTo, fdPlPage]);

  useEffect(() => {
    if (activeTab !== "fd-betting-pl") return;
    loadFdProfitLoss();
  }, [activeTab, loadFdProfitLoss]);

  const loadBettingPl = useCallback(() => {
    if (!playerId || !betDateFrom || !betDateTo) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(betDateFrom, betDateTo);
    setBettingPlLoading(true);
    setBettingPlError(null);
    getBettingProfitLoss({ fromDate: fromISO, toDate: toISO, userId: playerId })
      .then((groups) => {
        setBettingPlRows(flattenBettingProfitLoss(groups));
      })
      .catch((e) => {
        setBettingPlRows([]);
        setBettingPlError(
          e instanceof Error ? e.message : "Failed to load betting P&L.",
        );
      })
      .finally(() => setBettingPlLoading(false));
  }, [playerId, betDateFrom, betDateTo]);

  useEffect(() => {
    if (activeTab !== "betting-pl") return;
    loadBettingPl();
  }, [activeTab, loadBettingPl]);

  const loadAccountStatement = useCallback(() => {
    if (!playerId || !betDateFrom || !betDateTo) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(betDateFrom, betDateTo);
    setAcctStmtLoading(true);
    setAcctStmtError(null);
    getAccountStatement(
      {
        pageSize: STATEMENT_PAGE_SIZE,
        page: acctStmtPage,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { fromDate: fromISO, toDate: toISO },
      playerId,
    )
      .then((res) => {
        setAcctStmtRows(Array.isArray(res.data) ? res.data : []);
        setAcctStmtTotal(typeof res.total === "number" ? res.total : 0);
      })
      .catch((e) => {
        setAcctStmtRows([]);
        setAcctStmtTotal(0);
        setAcctStmtError(
          e instanceof Error ? e.message : "Failed to load account statement.",
        );
      })
      .finally(() => setAcctStmtLoading(false));
  }, [playerId, betDateFrom, betDateTo, acctStmtPage]);

  useEffect(() => {
    if (activeTab !== "account-statement") return;
    loadAccountStatement();
  }, [activeTab, loadAccountStatement]);

  const loadBonusStatement = useCallback(() => {
    if (!playerId || !betDateFrom || !betDateTo) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(betDateFrom, betDateTo);
    setBonusStmtLoading(true);
    setBonusStmtError(null);
    getBonusStatement(
      {
        pageSize: STATEMENT_PAGE_SIZE,
        page: bonusStmtPage,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { fromDate: fromISO, toDate: toISO },
      playerId,
    )
      .then((res) => {
        setBonusStmtRows(Array.isArray(res.data) ? res.data : []);
        setBonusStmtTotal(typeof res.total === "number" ? res.total : 0);
      })
      .catch((e) => {
        setBonusStmtRows([]);
        setBonusStmtTotal(0);
        setBonusStmtError(
          e instanceof Error ? e.message : "Failed to load bonus statement.",
        );
      })
      .finally(() => setBonusStmtLoading(false));
  }, [playerId, betDateFrom, betDateTo, bonusStmtPage]);

  useEffect(() => {
    if (activeTab !== "bonus-statement") return;
    loadBonusStatement();
  }, [activeTab, loadBonusStatement]);

  useEffect(() => {
    if (activeTab !== "referral-statement" || !playerId) return;
    let cancelled = false;
    setReferralBalanceText(null);
    setReferralBalanceError(null);
    getReferralBalance(playerId)
      .then((raw) => {
        if (cancelled) return;
        const apiErr = apiEnvelopeErrorText(raw);
        if (apiErr) {
          setReferralBalanceError(apiErr);
          setReferralBalanceText(null);
          return;
        }
        setReferralBalanceError(null);
        setReferralBalanceText(formatReferralBalanceFromResponse(raw));
      })
      .catch((e) => {
        if (cancelled) return;
        setReferralBalanceError(
          e instanceof Error ? e.message : "Could not load referral balance.",
        );
        setReferralBalanceText(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, playerId]);

  const loadReferralMembers = useCallback(() => {
    if (!playerId) return;
    setReferralMembersLoading(true);
    setReferralMembersError(null);
    getMyReferralMember(playerId)
      .then((list) => {
        setReferralMembers(
          list.map((x) =>
            x && typeof x === "object" ? (x as Record<string, unknown>) : {},
          ),
        );
      })
      .catch((e) => {
        setReferralMembers([]);
        setReferralMembersError(
          e instanceof Error ? e.message : "Failed to load referral users.",
        );
      })
      .finally(() => setReferralMembersLoading(false));
  }, [playerId]);

  const loadReferralStatement = useCallback(() => {
    if (!playerId || !betDateFrom || !betDateTo) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(betDateFrom, betDateTo);
    setReferralStmtLoading(true);
    setReferralStmtError(null);
    getReferralStatement(
      {
        pageSize: STATEMENT_PAGE_SIZE,
        page: referralStmtPage,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { fromDate: fromISO, toDate: toISO },
      playerId,
    )
      .then((res) => {
        setReferralStmtRows(Array.isArray(res.data) ? res.data : []);
        setReferralStmtTotal(typeof res.total === "number" ? res.total : 0);
      })
      .catch((e) => {
        setReferralStmtRows([]);
        setReferralStmtTotal(0);
        setReferralStmtError(
          e instanceof Error ? e.message : "Failed to load referral statement.",
        );
      })
      .finally(() => setReferralStmtLoading(false));
  }, [playerId, betDateFrom, betDateTo, referralStmtPage, referralStmtRefreshKey]);

  useEffect(() => {
    if (activeTab !== "referral-statement" || referralMode !== "statement") return;
    if (!playerId || !betDateFrom || !betDateTo) return;
    loadReferralStatement();
  }, [activeTab, referralMode, loadReferralStatement]);

  const loadTransferStatement = useCallback(() => {
    if (!playerId || !betDateFrom || !betDateTo) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(betDateFrom, betDateTo);
    setTransferStmtLoading(true);
    setTransferStmtError(null);
    getTransferStatement(
      {
        pageSize: STATEMENT_PAGE_SIZE,
        page: transferStmtPage,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { fromDate: fromISO, toDate: toISO },
      playerId,
    )
      .then((res) => {
        setTransferStmtRows(Array.isArray(res.data) ? res.data : []);
        setTransferStmtTotal(typeof res.total === "number" ? res.total : 0);
      })
      .catch((e) => {
        setTransferStmtRows([]);
        setTransferStmtTotal(0);
        setTransferStmtError(
          e instanceof Error ? e.message : "Failed to load transfer statement.",
        );
      })
      .finally(() => setTransferStmtLoading(false));
  }, [playerId, betDateFrom, betDateTo, transferStmtPage]);

  useEffect(() => {
    if (activeTab !== "transfer-statement") return;
    loadTransferStatement();
  }, [activeTab, loadTransferStatement]);

  const loadLoginHistory = useCallback(() => {
    if (!playerId) return;
    setLoginHistoryLoading(true);
    setLoginHistoryError(null);
    getLoginHistoryById(playerId)
      .then((rows) => {
        setLoginHistoryRows(
          rows.map((r) =>
            r && typeof r === "object" ? (r as Record<string, unknown>) : {},
          ),
        );
      })
      .catch((e) => {
        setLoginHistoryRows([]);
        setLoginHistoryError(
          e instanceof Error ? e.message : "Failed to load login history.",
        );
      })
      .finally(() => setLoginHistoryLoading(false));
  }, [playerId]);

  useEffect(() => {
    if (activeTab !== "login-history") return;
    loadLoginHistory();
  }, [activeTab, loadLoginHistory]);

  // Make tabs routable: /players/[playerId]?tab=activity|bet-list|...
  useEffect(() => {
    const raw = searchParams?.get("tab") ?? "";
    const next = raw.trim() as TabId;
    const isValid = PLAYER_DETAIL_TABS.some((t) => t.id === next);
    if (!isValid) return;
    setActiveTab(next);
  }, [searchParams]);

  const onTabChange = (id: string) => {
    const next = id as TabId;
    setActiveTab(next);
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "activity") {
      sp.delete("tab");
    } else {
      sp.set("tab", next);
    }
    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  useEffect(() => {
    if (!playerId || activeTab !== "activity") return;
    let cancelled = false;
    setLoadingActivity(true);
    setActivityError(null);

    // Load three activity sources; parsers match variable envelope/casing/row-list shapes (see block comment above).
    Promise.all([
      getUserActivity(playerId),
      getInOutActivity(playerId),
      getCasinoActivity(playerId),
    ])
      .then(([betActivity, inOutActivity, casinoActivity]) => {
        if (cancelled) return;
        const betParsed = parseBetActivityFromRoot(
          activityPayloadRoot(betActivity),
        );
        const dwParsed = parseInOutActivity(inOutActivity);
        const casinoParsed = parseCasinoActivity(casinoActivity);
        setActivityRows({
          win: betParsed.win,
          commission: betParsed.commission,
          pnl: betParsed.pnl,
          turnover: betParsed.turnover,
          deposit: dwParsed.deposit,
          withdrawal: dwParsed.withdrawal,
          casino: casinoParsed,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setActivityError(
          e instanceof Error ? e.message : "Failed to load activity.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingActivity(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerId, activeTab]);

  const tabs = useMemo(
    () =>
      PLAYER_DETAIL_TABS.map((tab) => {
        if (tab.id !== "activity") {
          if (tab.id === "bet-list") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setBetRefreshKey((k) => k + 1)}
                      className="inline-flex h-9 items-center justify-center rounded-sm border border-border bg-surface px-3 text-sm font-medium text-foreground-secondary hover:bg-surface-2"
                    >
                      Filter
                    </button>
                  </div>

                  {betError ? (
                    <p className="text-sm text-error" role="alert">
                      {betError}
                    </p>
                  ) : null}

                  <div className="border-b border-border">
                    <nav className="-mb-px flex items-center gap-5" aria-label="Bet period">
                      <button
                        type="button"
                        onClick={() => setBetPeriod("current")}
                        className={`border-b-2 px-0.5 py-2 text-sm font-medium transition-colors ${
                          betPeriod === "current"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted hover:border-border-strong hover:text-foreground-secondary"
                        }`}
                        aria-pressed={betPeriod === "current"}
                      >
                        Current
                      </button>
                      <button
                        type="button"
                        onClick={() => setBetPeriod("past")}
                        className={`border-b-2 px-0.5 py-2 text-sm font-medium transition-colors ${
                          betPeriod === "past"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted hover:border-border-strong hover:text-foreground-secondary"
                        }`}
                        aria-pressed={betPeriod === "past"}
                      >
                        Past
                      </button>
                    </nav>
                  </div>

                  {betPeriod === "current" ? (
                    <div className="flex flex-wrap items-center gap-5">
                      <label className="inline-flex items-center gap-2 text-sm text-foreground-secondary">
                        <input
                          type="radio"
                          name="bet-match-type"
                          checked={betMatchType === "matched"}
                          onChange={() => setBetMatchType("matched")}
                          className="h-4 w-4 border-border-strong"
                        />
                        Matched
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-foreground-secondary">
                        <input
                          type="radio"
                          name="bet-match-type"
                          checked={betMatchType === "unmatched"}
                          onChange={() => setBetMatchType("unmatched")}
                          className="h-4 w-4 border-border-strong"
                        />
                        UnMatched
                      </label>
                    </div>
                  ) : null}

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[920px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">IP Address</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Odds</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Stake</th>
                          {betPeriod === "current" ? (
                            <>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Liability</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Potential Profit</th>
                            </>
                          ) : (
                            <>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Status</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Win/Loss</th>
                            </>
                          )}
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Placed</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            {betPeriod === "current" ? "Matched" : "Settled"}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {betLoading ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-6 text-center text-sm text-muted">
                              Loading…
                            </td>
                          </tr>
                        ) : betRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-6 text-center text-sm text-muted">
                              No records found for selected filter and time period.
                            </td>
                          </tr>
                        ) : (
                          betRows.map((row, idx) => {
                            const r = row as Record<string, unknown>;
                            const ip = String(r.remoteIp ?? "—");
                            const odds = Number(r.price ?? r.odds ?? 0);
                            const stake = Number(r.size ?? r.stake ?? 0);
                            const liability = Number(r.liability ?? 0);
                            const profit = Number(r.pl ?? r.potentialProfit ?? 0);
                            const placed = formatDateTime(r.createdOn ?? r.createdAt);
                            const matchedOrSettled = formatDateTime(
                              (Array.isArray(r.betDetails) && (r.betDetails[0] as Record<string, unknown>)?.createdOn) ||
                                r.updatedOn ||
                                r.settleTime,
                            );
                            const status = String(r.status ?? "—");
                            const winLoss = Number(r.pl ?? r.winLoss ?? 0);

                            return (
                              <tr key={String(r.id ?? r.betId ?? idx)} className="border-b border-border">
                                <td className="px-4 py-3 text-sm text-foreground">{betDescription(r)}</td>
                                <td className="px-4 py-3 text-sm text-foreground">{ip}</td>
                                <td className="px-4 py-3 text-sm text-foreground">{betTypeLabel(r)}</td>
                                <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                  {odds ? String(odds) : "—"}
                                </td>
                                <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                  {formatCurrency(stake)}
                                </td>
                                {betPeriod === "current" ? (
                                  <>
                                    <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                      {formatCurrency(liability)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                      {formatCurrency(profit)}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 py-3 text-sm text-foreground">{status}</td>
                                    <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                      {formatCurrency(winLoss)}
                                    </td>
                                  </>
                                )}
                                <td className="px-4 py-3 text-center text-sm text-foreground whitespace-nowrap">{placed}</td>
                                <td className="px-4 py-3 text-center text-sm text-foreground whitespace-nowrap">{matchedOrSettled}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            };
          }
          if (tab.id === "betting-pl") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                  </div>

                  {bettingPlError ? (
                    <p className="text-sm text-error" role="alert">
                      {bettingPlError}
                    </p>
                  ) : null}

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[820px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Market Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Winner
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Start time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Settled Time
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Comm.
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Net Win
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bettingPlLoading ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                              Loading…
                            </td>
                          </tr>
                        ) : bettingPlRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                              No records found for selected filter and time period.
                            </td>
                          </tr>
                        ) : (
                            bettingPlRows.map((r, idx) => {
                              const eventName = String(r.eventName ?? "").trim();
                              const marketName = String(r.marketName ?? "").trim();
                              const marketLabel =
                                eventName && marketName
                                  ? `${eventName} — ${marketName}`
                                  : marketName || eventName || "—";
                              const netWin = Number(r.win ?? 0);
                              const comm = Number(r.comm ?? 0);
                              return (
                                <tr
                                  key={`${String(r.marketId ?? "")}-${String(r.roundId ?? "")}-${idx}`}
                                  className="border-b border-border bg-surface"
                                >
                                  <td className="px-4 py-3 text-sm text-foreground">
                                    <span className="block">{marketLabel}</span>
                                    {r.groupEventTypeName ? (
                                      <span className="text-xs text-muted">{r.groupEventTypeName}</span>
                                    ) : null}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-foreground">
                                    {r.winner ?? "—"}
                                  </td>
                                  <td className="px-4 py-3 text-sm whitespace-nowrap text-foreground-secondary">
                                    {formatDateTime(r.marketTime)}
                                  </td>
                                  <td className="px-4 py-3 text-sm whitespace-nowrap text-foreground-secondary">
                                    {formatDateTime(r.settleTime)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                    {formatCurrency(comm)}
                                  </td>
                                  <td
                                    className={`px-4 py-3 text-right text-sm tabular-nums ${
                                      netWin >= 0 ? "text-success" : "text-error"
                                    }`}
                                  >
                                    {formatCurrency(netWin)}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            };
          }
          if (tab.id === "fd-betting-pl") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                  </div>

                  {fdPlError ? (
                    <p className="text-sm text-error" role="alert">
                      {fdPlError}
                    </p>
                  ) : null}

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[760px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Round Id
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Game Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Provider
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            P&L
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Settle time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {fdPlLoading ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                              Loading…
                            </td>
                          </tr>
                        ) : fdPlRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                              No records found for selected filter and time period.
                            </td>
                          </tr>
                        ) : (
                          fdPlRows.map((r, idx) => {
                            const win = Number(r.win ?? 0);
                            const settleRaw = r.to;
                            const useTo =
                              settleRaw &&
                              typeof settleRaw === "string" &&
                              !settleRaw.startsWith("0001-01-01");
                            return (
                              <tr
                                key={`${String(r.roundId ?? idx)}-${idx}`}
                                className="border-b border-border bg-surface"
                              >
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {r.roundId != null ? String(r.roundId) : "—"}
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {r.tableName ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-sm text-foreground">
                                  {r.provider != null ? String(r.provider) : "—"}
                                </td>
                                <td
                                  className={`px-4 py-3 text-right text-sm tabular-nums ${
                                    win >= 0 ? "text-success" : "text-error"
                                  }`}
                                >
                                  {formatCurrency(win)}
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-foreground-secondary">
                                  {useTo ? formatDateTime(settleRaw) : formatDateTime(r.createdOn)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {fdPlTotal > FD_PL_PAGE_SIZE ? (
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <span className="text-sm text-muted">
                        Page {fdPlPage} · {fdPlTotal} total
                      </span>
                      <button
                        type="button"
                        disabled={fdPlPage <= 1 || fdPlLoading}
                        onClick={() => setFdPlPage((p) => Math.max(1, p - 1))}
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={fdPlPage * FD_PL_PAGE_SIZE >= fdPlTotal || fdPlLoading}
                        onClick={() => setFdPlPage((p) => p + 1)}
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </div>
              ),
            };
          }
          if (tab.id === "account-statement") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                  </div>

                  {acctStmtError ? (
                    <p className="text-sm text-error" role="alert">
                      {acctStmtError}
                    </p>
                  ) : null}

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[760px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Description
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            P&L
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Credit Limit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {acctStmtLoading ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                              Loading…
                            </td>
                          </tr>
                        ) : acctStmtRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                              No records found for selected filter and time period.
                            </td>
                          </tr>
                        ) : (
                          acctStmtRows.map((r, idx) => {
                            const pl = Number(r.balance ?? 0);
                            const creditLimit = Number(r.creditTotal ?? 0);
                            const balance = Number(r.total ?? 0);
                            return (
                              <tr
                                key={String(r.id ?? idx)}
                                className="border-b border-border bg-surface"
                              >
                                <td className="px-4 py-3 text-sm whitespace-nowrap text-foreground-secondary">
                                  {formatDateTime(r.createdOn)}
                                </td>
                                <td className="max-w-[280px] px-4 py-3 text-sm text-foreground">
                                  {accountStatementDescription(r)}
                                </td>
                                <td
                                  className={`px-4 py-3 text-right text-sm tabular-nums ${
                                    pl >= 0 ? "text-success" : "text-error"
                                  }`}
                                >
                                  {formatCurrency(pl)}
                                </td>
                                <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                  {formatCurrency(creditLimit)}
                                </td>
                                <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                  {formatCurrency(balance)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {acctStmtTotal > STATEMENT_PAGE_SIZE ? (
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <span className="text-sm text-muted">
                        Page {acctStmtPage} · {acctStmtTotal} total
                      </span>
                      <button
                        type="button"
                        disabled={acctStmtPage <= 1 || acctStmtLoading}
                        onClick={() => setAcctStmtPage((p) => Math.max(1, p - 1))}
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={
                          acctStmtPage * STATEMENT_PAGE_SIZE >= acctStmtTotal ||
                          acctStmtLoading
                        }
                        onClick={() => setAcctStmtPage((p) => p + 1)}
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </div>
              ),
            };
          }
          if (tab.id === "bonus-statement") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                  </div>

                  {bonusStmtError ? (
                    <p className="text-sm text-error" role="alert">
                      {bonusStmtError}
                    </p>
                  ) : null}

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[980px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Code
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Bonus Amount
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Required Turnover to Activate
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Required Turnover to Withdraw
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Bonus Date
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Bonus Expiry
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Is Expired
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bonusStmtLoading ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                              Loading…
                            </td>
                          </tr>
                        ) : bonusStmtRows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                              No records found for selected filter and time period.
                            </td>
                          </tr>
                        ) : (
                          bonusStmtRows.map((r, idx) => (
                            <tr
                              key={String(r.id ?? r.bonusId ?? idx)}
                              className="border-b border-border bg-surface"
                            >
                              <td className="px-4 py-3 text-sm text-foreground">
                                {bonusCellString(r, "code", "bonusCode", "promoCode")}
                              </td>
                              <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                {bonusCellNumber(
                                  r,
                                  "bonusAmount",
                                  "amount",
                                  "bonus",
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                {bonusCellNumber(
                                  r,
                                  "requiredTurnoverToActivate",
                                  "turnoverToActivate",
                                  "requiredTurnoverForActivation",
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                {bonusCellNumber(
                                  r,
                                  "requiredTurnoverToWithdraw",
                                  "turnoverToWithdraw",
                                  "requiredTurnoverForWithdrawal",
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-sm whitespace-nowrap text-foreground-secondary">
                                {formatDateTime(
                                  r.bonusDate ?? r.createdOn ?? r.issuedOn,
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-sm whitespace-nowrap text-foreground-secondary">
                                {formatDateTime(
                                  r.bonusExpiry ?? r.expiresOn ?? r.expiryDate,
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-foreground">
                                {bonusIsExpired(r)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {bonusStmtTotal > STATEMENT_PAGE_SIZE ? (
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <span className="text-sm text-muted">
                        Page {bonusStmtPage} · {bonusStmtTotal} total
                      </span>
                      <button
                        type="button"
                        disabled={bonusStmtPage <= 1 || bonusStmtLoading}
                        onClick={() => setBonusStmtPage((p) => Math.max(1, p - 1))}
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={
                          bonusStmtPage * STATEMENT_PAGE_SIZE >= bonusStmtTotal ||
                          bonusStmtLoading
                        }
                        onClick={() => setBonusStmtPage((p) => p + 1)}
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </div>
              ),
            };
          }
          if (tab.id === "referral-statement") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {referralMode === "statement" ? (
                        <>
                          <input
                            type="date"
                            value={betDateFrom}
                            onChange={(e) => setBetDateFrom(e.target.value)}
                            className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                          />
                          <span className="text-sm text-muted">to</span>
                          <input
                            type="date"
                            value={betDateTo}
                            onChange={(e) => setBetDateTo(e.target.value)}
                            className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                          />
                        </>
                      ) : (
                        <span className="text-sm text-muted">
                          Date range applies to referral statement only.
                        </span>
                      )}
                      <select
                        value={referralMode}
                        onChange={(e) =>
                          setReferralMode(e.target.value as "users" | "statement")
                        }
                        className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                        aria-label="Referral data type"
                      >
                        <option value="users">Get Referral Users</option>
                        <option value="statement">Get Referral Statement</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (referralMode === "users") {
                            loadReferralMembers();
                          } else {
                            setReferralStmtPage(1);
                            setReferralStmtRefreshKey((k) => k + 1);
                          }
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-sm border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                      >
                        Search
                      </button>
                    </div>
                    <div className="text-right text-sm">
                      <span className="font-medium text-foreground-secondary">
                        Referral balance:{" "}
                      </span>
                      {referralBalanceError ? (
                        <span className="text-error">{referralBalanceError}</span>
                      ) : (
                        <span className="text-foreground">
                          {referralBalanceText ?? "—"}
                        </span>
                      )}
                    </div>
                  </div>

                  {referralMode === "users" ? (
                    <>
                      {referralMembersError ? (
                        <p className="text-sm text-error" role="alert">
                          {referralMembersError}
                        </p>
                      ) : null}
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="min-w-[720px] w-full border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-surface-muted/70">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                Username
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                User code
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                User ID
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {referralMembersLoading ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                                  Loading…
                                </td>
                              </tr>
                            ) : referralMembers.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                                  No referral users. Click Search to load.
                                </td>
                              </tr>
                            ) : (
                              referralMembers.map((r, idx) => (
                                <tr
                                  key={String(r.id ?? r.userId ?? idx)}
                                  className="border-b border-border bg-surface"
                                >
                                  <td className="px-4 py-3 text-sm text-foreground">
                                    {bonusCellString(
                                      r,
                                      "username",
                                      "userName",
                                      "name",
                                    )}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-sm text-foreground-secondary">
                                    {bonusCellString(r, "userCode", "code")}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-foreground">
                                    {r.status != null ? String(r.status) : "—"}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-xs text-foreground-secondary">
                                    {bonusCellString(r, "id", "userId")}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <>
                      {referralStmtError ? (
                        <p className="text-sm text-error" role="alert">
                          {referralStmtError}
                        </p>
                      ) : null}
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="min-w-[760px] w-full border-collapse">
                          <thead>
                            <tr className="border-b border-border bg-surface-muted/70">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                Description
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                Amount
                              </th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                Balance
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {referralStmtLoading ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                                  Loading…
                                </td>
                              </tr>
                            ) : referralStmtRows.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                                  No records for this date range.
                                </td>
                              </tr>
                            ) : (
                              referralStmtRows.map((r, idx) => {
                                const amt = Number(
                                  r.amount ?? r.balance ?? r.credit ?? r.debit ?? 0,
                                );
                                const bal = Number(
                                  r.total ?? r.runningBalance ?? r.afterBalance ?? NaN,
                                );
                                return (
                                  <tr
                                    key={String(r.id ?? idx)}
                                    className="border-b border-border bg-surface"
                                  >
                                    <td className="px-4 py-3 text-sm whitespace-nowrap text-foreground-secondary">
                                      {formatDateTime(r.createdOn ?? r.date)}
                                    </td>
                                    <td className="max-w-[320px] px-4 py-3 text-sm text-foreground">
                                      {accountStatementDescription(r)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                      {Number.isFinite(amt) ? formatCurrency(amt) : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                      {Number.isFinite(bal) ? formatCurrency(bal) : "—"}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                      {referralStmtTotal > STATEMENT_PAGE_SIZE ? (
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <span className="text-sm text-muted">
                            Page {referralStmtPage} · {referralStmtTotal} total
                          </span>
                          <button
                            type="button"
                            disabled={referralStmtPage <= 1 || referralStmtLoading}
                            onClick={() => setReferralStmtPage((p) => Math.max(1, p - 1))}
                            className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            disabled={
                              referralStmtPage * STATEMENT_PAGE_SIZE >= referralStmtTotal ||
                              referralStmtLoading
                            }
                            onClick={() => setReferralStmtPage((p) => p + 1)}
                            className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ),
            };
          }
          if (tab.id === "transfer-statement") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                  </div>
                  {transferStmtError ? (
                    <p className="text-sm text-error" role="alert">
                      {transferStmtError}
                    </p>
                  ) : null}
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[800px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Description
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {transferStmtLoading ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                              Loading…
                            </td>
                          </tr>
                        ) : transferStmtRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted">
                              No transfers for this date range.
                            </td>
                          </tr>
                        ) : (
                          transferStmtRows.map((r, idx) => {
                            const amt = Number(
                              r.amount ?? r.chips ?? r.balance ?? r.delta ?? 0,
                            );
                            const bal = Number(r.total ?? r.afterBalance ?? NaN);
                            return (
                              <tr
                                key={String(r.id ?? idx)}
                                className="border-b border-border bg-surface"
                              >
                                <td className="px-4 py-3 text-sm whitespace-nowrap text-foreground-secondary">
                                  {formatDateTime(r.createdOn ?? r.date)}
                                </td>
                                <td className="max-w-[360px] px-4 py-3 text-sm text-foreground">
                                  {accountStatementDescription(r)}
                                </td>
                                <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                  {Number.isFinite(amt) ? formatCurrency(amt) : "—"}
                                </td>
                                <td className="px-4 py-3 text-right text-sm tabular-nums text-foreground">
                                  {Number.isFinite(bal) ? formatCurrency(bal) : "—"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {transferStmtTotal > STATEMENT_PAGE_SIZE ? (
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <span className="text-sm text-muted">
                        Page {transferStmtPage} · {transferStmtTotal} total
                      </span>
                      <button
                        type="button"
                        disabled={transferStmtPage <= 1 || transferStmtLoading}
                        onClick={() => setTransferStmtPage((p) => Math.max(1, p - 1))}
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={
                          transferStmtPage * STATEMENT_PAGE_SIZE >= transferStmtTotal ||
                          transferStmtLoading
                        }
                        onClick={() => setTransferStmtPage((p) => p + 1)}
                        className="h-9 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  ) : null}
                </div>
              ),
            };
          }
          if (tab.id === "login-history") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-3">
                  {loginHistoryError ? (
                    <p className="text-sm text-error" role="alert">
                      {loginHistoryError}
                    </p>
                  ) : null}
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[960px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Login date &amp; time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Logout date &amp; time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            IP address
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            ISP
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            City, state, country
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Active for
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginHistoryLoading ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                              Loading…
                            </td>
                          </tr>
                        ) : loginHistoryRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                              No records found.
                            </td>
                          </tr>
                        ) : (
                          loginHistoryRows.map((r, idx) => (
                            <tr
                              key={`${String(r.remoteIp ?? "")}-${String(r.issuedOn ?? idx)}`}
                              className="border-b border-border bg-surface"
                            >
                              <td className="px-4 py-3 text-sm whitespace-nowrap text-foreground">
                                {formatDateTime(r.issuedOn)}
                              </td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap text-foreground-secondary">
                                {formatDateTime(r.expiresOn)}
                              </td>
                              <td className="px-4 py-3 font-mono text-sm text-foreground">
                                {String(r.remoteIp ?? "—")}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground-secondary">
                                {String(r.provider ?? "—")}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {String(r.location ?? "—")}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground-secondary">
                                {String(r.loginSince ?? "—")}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            };
          }
          const _unreachable: never = tab;
          return _unreachable;
        }

        return {
          id: tab.id,
          label: tab.label,
          content: (
            <div className="space-y-3">
              {activityError ? (
                <p className="text-sm text-error" role="alert">
                  {activityError}
                </p>
              ) : null}
              {loadingActivity ? (
                <p className="text-sm text-muted">Loading activity...</p>
              ) : null}
              <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                <table className="min-w-[760px] w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/70">
                      <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary"> </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Today</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">3 days</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">7 days</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">30 days</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Lifetime</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Win</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.win, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.win, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.win, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.win, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.win, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Comm</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.commission, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.commission, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.commission, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.commission, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.commission, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">P&L</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.pnl, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.pnl, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.pnl, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.pnl, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.pnl, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Turnover</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.turnover, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.turnover, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.turnover, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.turnover, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.turnover, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface-muted/35">
                      <td colSpan={6} className="h-3 px-0 py-0" />
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Deposit</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.deposit, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.deposit, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.deposit, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.deposit, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.deposit, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Withdrawal</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.withdrawal, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.withdrawal, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.withdrawal, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.withdrawal, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.withdrawal, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">D-W</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{formatCurrency(activityRows.deposit.day1 - activityRows.withdrawal.day1)}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{formatCurrency(activityRows.deposit.day3 - activityRows.withdrawal.day3)}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{formatCurrency(activityRows.deposit.day7 - activityRows.withdrawal.day7)}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{formatCurrency(activityRows.deposit.day30 - activityRows.withdrawal.day30)}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{formatCurrency(activityRows.deposit.lifetime - activityRows.withdrawal.lifetime)}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface-muted/35">
                      <td colSpan={6} className="h-3 px-0 py-0" />
                    </tr>
                    <tr className="bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Casino</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.casino, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.casino, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.casino, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.casino, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.casino, "lifetime")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ),
        };
      }),
    [
      activityError,
      loadingActivity,
      activityRows,
      betDateFrom,
      betDateTo,
      betPeriod,
      betMatchType,
      referralMode,
      referralMembers,
      referralMembersLoading,
      referralMembersError,
      referralBalanceText,
      referralBalanceError,
      referralStmtRows,
      referralStmtTotal,
      referralStmtPage,
      referralStmtLoading,
      referralStmtError,
      transferStmtRows,
      transferStmtTotal,
      transferStmtPage,
      transferStmtLoading,
      transferStmtError,
      loginHistoryRows,
      loginHistoryLoading,
      loginHistoryError,
      loadReferralMembers,
      fdPlRows,
      fdPlTotal,
      fdPlPage,
      fdPlLoading,
      fdPlError,
      betRows,
      betTotal,
      betLoading,
      betError,
      bettingPlRows,
      bettingPlLoading,
      bettingPlError,
      acctStmtRows,
      acctStmtTotal,
      acctStmtPage,
      acctStmtLoading,
      acctStmtError,
      bonusStmtRows,
      bonusStmtTotal,
      bonusStmtPage,
      bonusStmtLoading,
      bonusStmtError,
    ],
  );

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader title="Player Detail" breadcrumbs={["Players", "Detail"]} />
      <Card padded={false}>
        <div className="px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-3">
          <Tabs
            activeId={activeTab}
            onTabChange={onTabChange}
            tabs={tabs}
          />
        </div>
      </Card>
    </div>
  );
}

