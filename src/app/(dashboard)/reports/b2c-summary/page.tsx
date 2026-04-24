"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronsRight, Download, Network } from "lucide-react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Button,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components";
import { getB2cSummary, type B2cSummaryRow } from "@/services/account.service";
import { todayRangeUTC, dateRangeToISO } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { formatB2cSummaryGridDate } from "@/utils/b2cTransactionReportFormat";
import { buildB2cTransactionsHref } from "@/utils/b2cTransactionRoutes";

const PAGE_SIZE = 50;

type DepositTierFilter = "all" | "1st" | "2nd" | "3rd";

/** Which drill-down panel is open for an expanded B2C row. */
type B2cExpandPanel = "none" | "newClients" | "codeUsed" | "deposits";

function len(a: unknown[] | undefined): number {
  return Array.isArray(a) ? a.length : 0;
}

function b2cRowTxHref(
  r: B2cSummaryRow,
  kind: "dw" | "bonus",
  dwType: string,
): string | undefined {
  const uid = r.userId?.trim();
  const sid = r.id?.trim();
  const agent = r.agentName?.trim();
  if (!uid || !sid || !agent) return undefined;
  return buildB2cTransactionsHref({
    summaryId: sid,
    userId: uid,
    agentName: agent,
    dateRaw: r.date,
    kind,
    dwType,
  });
}

function parseDepositEntry(entry: unknown): {
  userId?: string;
  username?: string;
  mobile?: string;
  amount?: number;
} {
  if (!entry || typeof entry !== "object") return {};
  const o = entry as Record<string, unknown>;
  return {
    userId: typeof o.userId === "string" ? o.userId : undefined,
    username: typeof o.username === "string" ? o.username : undefined,
    mobile: typeof o.mobile === "string" ? o.mobile : undefined,
    amount: typeof o.amount === "number" ? o.amount : undefined,
  };
}

function parseNewUserEntry(entry: unknown): {
  userId?: string;
  username?: string;
  mobile?: string;
  bonusCode?: string;
} {
  if (!entry || typeof entry !== "object") return {};
  const o = entry as Record<string, unknown>;
  return {
    userId: typeof o.userId === "string" ? o.userId : undefined,
    username:
      typeof o.username === "string"
        ? o.username
        : typeof o.userName === "string"
          ? o.userName
          : undefined,
    mobile: typeof o.mobile === "string" ? o.mobile : undefined,
    bonusCode:
      typeof o.bonusCode === "string"
        ? o.bonusCode
        : typeof o.code === "string"
          ? o.code
          : undefined,
  };
}

function buildNewUserLines(r: B2cSummaryRow): Array<{
  userId?: string;
  username?: string;
  mobile?: string;
  bonusCode?: string;
}> {
  const arr = r.newUsers;
  if (!Array.isArray(arr)) return [];
  return arr.map((e) => parseNewUserEntry(e));
}

function parseBonusCodeEntry(entry: unknown): {
  code?: string;
  count?: number;
  amount?: number;
} {
  if (entry == null) return {};
  if (typeof entry === "string") {
    return { code: entry.trim() || undefined, count: 1 };
  }
  if (typeof entry !== "object") return {};
  const o = entry as Record<string, unknown>;
  const code =
    typeof o.bonusCode === "string"
      ? o.bonusCode
      : typeof o.code === "string"
        ? o.code
        : typeof o.name === "string"
          ? o.name
          : undefined;
  const rawCount = o.count ?? o.usedCount;
  const rawAmount = o.amount ?? o.bonusAmount ?? o.totalAmount;
  const count =
    typeof rawCount === "number"
      ? rawCount
      : typeof rawCount === "string"
        ? Number(rawCount)
        : undefined;
  const amount =
    typeof rawAmount === "number"
      ? rawAmount
      : typeof rawAmount === "string"
        ? Number(rawAmount)
        : undefined;
  return {
    code,
    count: Number.isFinite(count) ? count : undefined,
    amount: Number.isFinite(amount) ? amount : undefined,
  };
}

function buildBonusCodeLines(
  r: B2cSummaryRow,
): Array<{ code?: string; count?: number; amount?: number }> {
  const arr = r.bonusCodeList;
  if (!Array.isArray(arr)) return [];
  return arr.map((e) => parseBonusCodeEntry(e));
}

function buildTierDetailLines(r: B2cSummaryRow): Array<{
  tier: string;
  userId?: string;
  username?: string;
  mobile?: string;
  amount?: number;
}> {
  const out: Array<{
    tier: string;
    userId?: string;
    username?: string;
    mobile?: string;
    amount?: number;
  }> = [];
  const add = (tier: string, arr: unknown[] | undefined) => {
    if (!Array.isArray(arr)) return;
    for (const e of arr) {
      const p = parseDepositEntry(e);
      out.push({ tier, ...p });
    }
  };
  add("1st", r.firstDeposit);
  add("2nd", r.secondDeposit);
  add("3rd", r.thirdDeposit);
  return out;
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(rows: B2cSummaryRow[]): string {
  const headers = [
    "Date",
    "Agent",
    "New Clients",
    "Code Used",
    "1st/2nd/3rd",
    "Count/Deposit",
    "Count/Withdrawal",
    "Count/Bonus",
    "Net Deposit",
    "Bonus Activated",
    "Bonus Redeem",
    "Bonus Expired",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const nNew = len(r.newUsers);
    const nCode = len(r.bonusCodeList);
    const a = len(r.firstDeposit);
    const b = len(r.secondDeposit);
    const c = len(r.thirdDeposit);
    lines.push(
      [
        csvEscape(formatB2cSummaryGridDate(r.date)),
        csvEscape(String(r.agentName ?? "")),
        String(nNew),
        String(nCode),
        csvEscape(`${a}/${b}/${c}`),
        csvEscape(`${r.depositCount ?? 0}/${r.deposit ?? 0}`),
        csvEscape(`${r.withdrawalCount ?? 0}/${r.withdrawal ?? 0}`),
        csvEscape(`${r.bonusCount ?? 0}/${r.bonus ?? 0}`),
        csvEscape(String(r.netDeposit ?? 0)),
        csvEscape(String(r.bonusActivated ?? 0)),
        csvEscape(String(r.bonusRedeem ?? 0)),
        csvEscape(String(r.bonusExpired ?? 0)),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

function DepositTierCounts({
  first,
  second,
  third,
  interactive = false,
  activeTier,
  onTierClick,
}: {
  first: number;
  second: number;
  third: number;
  interactive?: boolean;
  /** When this row is expanded, which tier filter is active (highlights that segment). */
  activeTier?: DepositTierFilter;
  onTierClick?: (tier: Exclude<DepositTierFilter, "all">) => void;
}) {
  const seg = (n: number, tier: Exclude<DepositTierFilter, "all">) => {
    const isActive = activeTier === tier;
    const inner = (
      <>
        <span>{n}</span>
        {n > 0 ? <Network className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> : null}
      </>
    );
    const activeCls = isActive
      ? "bg-primary/15 ring-1 ring-primary/40"
      : "hover:bg-surface-muted/80";
    if (interactive && onTierClick) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTierClick(tier);
          }}
          className={`inline-flex items-center gap-0.5 rounded-sm px-0.5 py-0.5 transition-colors ${activeCls}`}
          aria-pressed={isActive}
          aria-label={`Filter deposits by ${tier} tier`}
        >
          {inner}
        </button>
      );
    }
    return <span className="inline-flex items-center gap-0.5">{inner}</span>;
  };
  return (
    <div className="flex flex-wrap items-center gap-x-1 tabular-nums">
      {seg(first, "1st")}
      <span className="text-muted">/</span>
      {seg(second, "2nd")}
      <span className="text-muted">/</span>
      {seg(third, "3rd")}
    </div>
  );
}

function DepositTierExpandPanel({
  row,
  tierFilter,
}: {
  row: B2cSummaryRow;
  tierFilter: DepositTierFilter;
}) {
  const lines = buildTierDetailLines(row);
  const filtered =
    tierFilter === "all"
      ? lines
      : lines.filter((l) => l.tier === tierFilter);
  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted">No 1st / 2nd / 3rd deposit records for this row.</p>
    );
  }
  if (filtered.length === 0) {
    return (
      <p className="text-sm text-muted">
        No {tierFilter} deposit records for this row.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-surface">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-surface-muted/60">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Tier
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Mobile
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Username
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Deposit
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((line, idx) => (
            <tr
              key={`${line.tier}-${line.userId ?? line.username ?? idx}`}
              className="border-t border-border"
            >
              <td className="px-3 py-2 text-foreground">{line.tier}</td>
              <td className="px-3 py-2 text-foreground">{line.mobile ?? "—"}</td>
              <td className="px-3 py-2 text-foreground">{line.username ?? "—"}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${signedAmountTextClass(Number(line.amount ?? 0))}`}>
                {formatCurrency(line.amount ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewClientsExpandPanel({ row }: { row: B2cSummaryRow }) {
  const lines = buildNewUserLines(row);
  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted">No new client records for this row.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-surface">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-surface-muted/60">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Mobile
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Username
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Bonus Code
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr
              key={`${line.userId ?? line.username ?? line.mobile ?? idx}`}
              className="border-t border-border"
            >
              <td className="px-3 py-2 text-foreground">{line.mobile ?? "—"}</td>
              <td className="px-3 py-2 text-foreground">{line.username ?? "—"}</td>
              <td className="px-3 py-2 text-foreground">{line.bonusCode ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BonusCodeExpandPanel({ row }: { row: B2cSummaryRow }) {
  const lines = buildBonusCodeLines(row);
  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted">No bonus code records for this row.</p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-sm border border-border bg-surface">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-surface-muted/60">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Bonus Code
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Count
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => (
            <tr
              key={`${line.code ?? "row"}-${idx}`}
              className="border-t border-border"
            >
              <td className="px-3 py-2 text-foreground">{line.code ?? "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground">
                {line.count != null ? line.count : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground">
                {line.amount != null ? (
                  <span className={signedAmountTextClass(Number(line.amount))}>
                    {formatCurrency(line.amount)}
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Drill-down to transaction report: reads as a link (not plain grid text). */
const b2cSummaryTxLinkClass =
  "cursor-pointer rounded-sm font-medium text-primary underline decoration-2 underline-offset-2 decoration-primary/75 transition-colors hover:bg-primary/10 hover:decoration-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";

function b2cTxAmountLinkClass(amount: number): string {
  return b2cSummaryTxLinkClass.replace(/\btext-primary\b/g, signedAmountTextClass(amount));
}

function CountSlashAmount({
  count,
  amount,
  amountHref,
}: {
  count: number;
  amount: number;
  /** Navigates to B2C transaction child page (amount segment only). */
  amountHref?: string;
}) {
  const amountEl =
    amountHref != null ? (
      <Link
        href={amountHref}
        onClick={(e) => e.stopPropagation()}
        className={b2cTxAmountLinkClass(amount)}
        title="View transactions"
      >
        {formatCurrency(amount)}
      </Link>
    ) : (
      <span className={`tabular-nums ${signedAmountTextClass(amount)}`}>{formatCurrency(amount)}</span>
    );
  return (
    <span className="tabular-nums">
      <span>{count}</span>
      <span className="text-muted"> / </span>
      {amountEl}
    </span>
  );
}

function BonusAmount({
  value,
  href,
}: {
  value: number;
  href?: string;
}) {
  if (href) {
    return (
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className={b2cTxAmountLinkClass(value)}
        title="View transactions"
      >
        {formatCurrency(value)}
      </Link>
    );
  }
  return (
    <span className={`tabular-nums ${signedAmountTextClass(value)}`}>{formatCurrency(value)}</span>
  );
}

export default function B2cSummaryPage() {
  const [items, setItems] = useState<B2cSummaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [expandPanel, setExpandPanel] = useState<B2cExpandPanel>("none");
  const [depositTierFilter, setDepositTierFilter] =
    useState<DepositTierFilter>("all");

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  const load = useCallback(() => {
    if (!fromDate || !toDate) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
    setLoading(true);
    setError(null);
    getB2cSummary(
      {
        page,
        pageSize,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { fromDate: fromISO, toDate: toISO },
    )
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e) => {
        setItems([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load B2C summary.");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, fromDate, toDate, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setExpandedRowId(null);
    setExpandPanel("none");
    setDepositTierFilter("all");
  }, [fromDate, toDate, refreshKey, page, pageSize]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, r) => ({
        newClients: acc.newClients + len(r.newUsers),
        codeUsed: acc.codeUsed + len(r.bonusCodeList),
        first: acc.first + len(r.firstDeposit),
        second: acc.second + len(r.secondDeposit),
        third: acc.third + len(r.thirdDeposit),
        depositCount: acc.depositCount + (Number(r.depositCount) || 0),
        deposit: acc.deposit + (Number(r.deposit) || 0),
        withdrawalCount: acc.withdrawalCount + (Number(r.withdrawalCount) || 0),
        withdrawal: acc.withdrawal + (Number(r.withdrawal) || 0),
        bonusCount: acc.bonusCount + (Number(r.bonusCount) || 0),
        bonus: acc.bonus + (Number(r.bonus) || 0),
        netDeposit: acc.netDeposit + (Number(r.netDeposit) || 0),
        bonusActivated: acc.bonusActivated + (Number(r.bonusActivated) || 0),
        bonusRedeem: acc.bonusRedeem + (Number(r.bonusRedeem) || 0),
        bonusExpired: acc.bonusExpired + (Number(r.bonusExpired) || 0),
      }),
      {
        newClients: 0,
        codeUsed: 0,
        first: 0,
        second: 0,
        third: 0,
        depositCount: 0,
        deposit: 0,
        withdrawalCount: 0,
        withdrawal: 0,
        bonusCount: 0,
        bonus: 0,
        netDeposit: 0,
        bonusActivated: 0,
        bonusRedeem: 0,
        bonusExpired: 0,
      },
    );
  }, [items]);

  const onDownloadCsv = () => {
    if (items.length === 0) return;
    const blob = new Blob([`\uFEFF${buildCsv(items)}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `b2c-summary-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const th =
    "px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary sm:px-3";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="B2C Summary"
        breadcrumbs={["Reports", "B2C Summary"]}
        action={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="h-4 w-4" aria-hidden />}
            onClick={onDownloadCsv}
            disabled={items.length === 0}
          >
            Download CSV
          </Button>
        }
      />

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setPage(1);
                setFromDate(e.target.value);
              }}
              className="max-w-[170px]"
              aria-label="From date"
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setPage(1);
                setToDate(e.target.value);
              }}
              className="max-w-[170px]"
              aria-label="To date"
            />
            <div className="flex-1" />
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => {
                setPage(1);
                setRefreshKey((k) => k + 1);
              }}
            >
              Apply
            </Button>
          </FilterBar>

          <ListTableSection>
            <Table className="w-full min-w-max rounded-lg">
              <TableHeader className="w-full bg-white uppercase">
              <TableHead className={th}>Date</TableHead>
              <TableHead className={th}>Agent</TableHead>
              <TableHead className={`${th} text-right`} >
                New Clients
              </TableHead>
              <TableHead className={`${th} text-right`} >
                Code Used
              </TableHead>
              <TableHead className={th}>1st/2nd/3rd</TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} >
                Count/Deposit
              </TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} >
                Count/Withdrawal
              </TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} >
                Count/Bonus
              </TableHead>
              <TableHead className={`${th} text-right`} >
                Net Deposit
              </TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} >
                Bonus Activated
              </TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} >
                Bonus Redeem
              </TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} >
                Bonus Expired
              </TableHead>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableEmpty colSpan={12} message="Loading…" />
              ) : items.length === 0 ? (
                <TableEmpty colSpan={12} message="No data for this range." />
              ) : (
                <>
                  {items.map((r) => {
                    const nNew = len(r.newUsers);
                    const nCode = len(r.bonusCodeList);
                    const d1 = len(r.firstDeposit);
                    const d2 = len(r.secondDeposit);
                    const d3 = len(r.thirdDeposit);
                    const depositExpanded =
                      expandedRowId === r.id && expandPanel === "deposits";
                    const newClientsOpen =
                      expandedRowId === r.id && expandPanel === "newClients";
                    const codeUsedOpen =
                      expandedRowId === r.id && expandPanel === "codeUsed";
                    return (
                      <Fragment key={r.id}>
                        <TableRow>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatB2cSummaryGridDate(r.date)}
                        </TableCell>
                        <TableCell className="text-sm">{r.agentName ?? "—"}</TableCell>
                        <TableCell  className="text-sm tabular-nums">
                          <button
                            type="button"
                            onClick={() => {
                              if (newClientsOpen) {
                                setExpandedRowId(null);
                                setExpandPanel("none");
                              } else {
                                setExpandedRowId(r.id);
                                setExpandPanel("newClients");
                              }
                            }}
                            className={`inline-flex w-full min-w-[4rem] items-center justify-end gap-1 rounded-sm px-0.5 py-0.5 transition-colors hover:bg-surface-muted/60 ${
                              newClientsOpen
                                ? "bg-primary/15 ring-1 ring-primary/40"
                                : ""
                            }`}
                            aria-expanded={newClientsOpen}
                            aria-label="Show new client details"
                          >
                            {nNew}
                            {nNew > 0 ? (
                              <Network className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                            ) : null}
                          </button>
                        </TableCell>
                        <TableCell  className="tabular-nums text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              if (codeUsedOpen) {
                                setExpandedRowId(null);
                                setExpandPanel("none");
                              } else {
                                setExpandedRowId(r.id);
                                setExpandPanel("codeUsed");
                              }
                            }}
                            className={`inline-flex w-full min-w-[4rem] items-center justify-end gap-1 rounded-sm px-0.5 py-0.5 transition-colors hover:bg-surface-muted/60 ${
                              codeUsedOpen
                                ? "bg-primary/15 ring-1 ring-primary/40"
                                : ""
                            }`}
                            aria-expanded={codeUsedOpen}
                            aria-label="Show bonus code usage details"
                          >
                            {nCode}
                            {nCode > 0 ? (
                              <Network className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                            ) : null}
                          </button>
                        </TableCell>
                        <TableCell className="min-w-[7rem] text-sm">
                          <div className="flex w-full min-w-0 items-center justify-between gap-2 rounded-sm py-0.5">
                            <DepositTierCounts
                              first={d1}
                              second={d2}
                              third={d3}
                              interactive
                              activeTier={
                                depositExpanded ? depositTierFilter : undefined
                              }
                              onTierClick={(tier) => {
                                setExpandedRowId(r.id);
                                setExpandPanel("deposits");
                                setDepositTierFilter(tier);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (depositExpanded) {
                                  setExpandedRowId(null);
                                  setExpandPanel("none");
                                } else {
                                  setExpandedRowId(r.id);
                                  setExpandPanel("deposits");
                                  setDepositTierFilter("all");
                                }
                              }}
                              className="shrink-0 rounded-sm p-0.5 hover:bg-surface-muted/60"
                              aria-expanded={depositExpanded}
                              aria-label="Expand or collapse 1st 2nd 3rd deposit details"
                            >
                              <ChevronsRight
                                className={`h-4 w-4 text-primary transition-transform ${depositExpanded ? "rotate-90" : ""}`}
                                aria-hidden
                              />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell  className="text-sm">
                          <CountSlashAmount
                            count={Number(r.depositCount) || 0}
                            amount={Number(r.deposit) || 0}
                            amountHref={b2cRowTxHref(r, "dw", "D")}
                          />
                        </TableCell>
                        <TableCell  className="text-sm">
                          <CountSlashAmount
                            count={Number(r.withdrawalCount) || 0}
                            amount={Number(r.withdrawal) || 0}
                            amountHref={b2cRowTxHref(r, "dw", "W")}
                          />
                        </TableCell>
                        <TableCell  className="text-sm">
                          <CountSlashAmount
                            count={Number(r.bonusCount) || 0}
                            amount={Number(r.bonus) || 0}
                          />
                        </TableCell>
                        <TableCell  className={`tabular-nums text-sm ${signedAmountTextClass(Number(r.netDeposit ?? 0))}`}>
                          {formatCurrency(r.netDeposit)}
                        </TableCell>
                        <TableCell  className="text-sm">
                          <BonusAmount
                            value={Number(r.bonusActivated) || 0}
                            href={b2cRowTxHref(r, "bonus", "A")}
                          />
                        </TableCell>
                        <TableCell  className="text-sm">
                          <BonusAmount
                            value={Number(r.bonusRedeem) || 0}
                            href={b2cRowTxHref(r, "bonus", "R")}
                          />
                        </TableCell>
                        <TableCell  className="text-sm">
                          <BonusAmount
                            value={Number(r.bonusExpired) || 0}
                            href={b2cRowTxHref(r, "bonus", "E")}
                          />
                        </TableCell>
                        </TableRow>
                        {expandedRowId === r.id && expandPanel !== "none" ? (
                          <TableRow className="bg-surface-muted/30">
                            <td colSpan={12} className="p-0">
                              <div className="px-4 py-3 sm:pl-10">
                                {expandPanel === "deposits" ? (
                                  <DepositTierExpandPanel
                                    row={r}
                                    tierFilter={depositTierFilter}
                                  />
                                ) : null}
                                {expandPanel === "newClients" ? (
                                  <NewClientsExpandPanel row={r} />
                                ) : null}
                                {expandPanel === "codeUsed" ? (
                                  <BonusCodeExpandPanel row={r} />
                                ) : null}
                              </div>
                            </td>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                  <TableRow className="bg-surface-muted/50 font-medium">
                    <td colSpan={2} className="px-4 py-3 text-left text-sm text-foreground">
                      Total
                    </td>
                    <TableCell  className="tabular-nums text-sm">
                      <span className="inline-flex items-center justify-end gap-1">
                        {totals.newClients}
                        {totals.newClients > 0 ? (
                          <Network className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell  className="tabular-nums text-sm">
                      <span className="inline-flex items-center justify-end gap-1">
                        {totals.codeUsed}
                        {totals.codeUsed > 0 ? (
                          <Network className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-[7rem] text-sm">
                      <DepositTierCounts
                        first={totals.first}
                        second={totals.second}
                        third={totals.third}
                      />
                    </TableCell>
                    <TableCell  className="text-sm">
                      <CountSlashAmount
                        count={totals.depositCount}
                        amount={totals.deposit}
                      />
                    </TableCell>
                    <TableCell  className="text-sm">
                      <CountSlashAmount
                        count={totals.withdrawalCount}
                        amount={totals.withdrawal}
                      />
                    </TableCell>
                    <TableCell  className="text-sm">
                      <CountSlashAmount count={totals.bonusCount} amount={totals.bonus} />
                    </TableCell>
                    <TableCell  className={`tabular-nums text-sm ${signedAmountTextClass(Number(totals.netDeposit ?? 0))}`}>
                      {formatCurrency(totals.netDeposit)}
                    </TableCell>
                    <TableCell  className="text-sm">
                      <BonusAmount value={totals.bonusActivated} />
                    </TableCell>
                    <TableCell  className="text-sm">
                      <BonusAmount value={totals.bonusRedeem} />
                    </TableCell>
                    <TableCell  className="text-sm">
                      <BonusAmount value={totals.bonusExpired} />
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
            </Table>
            {!loading && total > 0 ? (
              <TablePagination
                page={page}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            ) : null}
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
