"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronsRight, Download, Users } from "lucide-react";
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

const PAGE_SIZE = 50;

function formatDateCell(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function len(a: unknown[] | undefined): number {
  return Array.isArray(a) ? a.length : 0;
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
        csvEscape(formatDateCell(r.date)),
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
}: {
  first: number;
  second: number;
  third: number;
}) {
  const seg = (n: number) => (
    <span className="inline-flex items-center gap-0.5">
      <span>{n}</span>
      {n > 0 ? <Users className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> : null}
    </span>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-1 tabular-nums">
      {seg(first)}
      <span className="text-muted">/</span>
      {seg(second)}
      <span className="text-muted">/</span>
      {seg(third)}
    </div>
  );
}

function DepositTierExpandPanel({ row }: { row: B2cSummaryRow }) {
  const lines = buildTierDetailLines(row);
  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted">No 1st / 2nd / 3rd deposit records for this row.</p>
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
          {lines.map((line, idx) => (
            <tr
              key={`${line.tier}-${line.userId ?? line.username ?? idx}`}
              className="border-t border-border"
            >
              <td className="px-3 py-2 text-foreground">{line.tier}</td>
              <td className="px-3 py-2 text-foreground">{line.mobile ?? "—"}</td>
              <td className="px-3 py-2 text-foreground">{line.username ?? "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-foreground">
                {formatCurrency(line.amount ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountSlashAmount({
  count,
  amount,
}: {
  count: number;
  amount: number;
}) {
  return (
    <span className="tabular-nums">
      <span>{count}</span>
      <span className="text-muted"> / </span>
      <span className="underline decoration-dotted underline-offset-2">
        {formatCurrency(amount)}
      </span>
    </span>
  );
}

function BonusAmount({ value }: { value: number }) {
  return (
    <span className="tabular-nums underline decoration-dotted underline-offset-2">
      {formatCurrency(value)}
    </span>
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
  const [expandedDepositRowId, setExpandedDepositRowId] = useState<string | null>(
    null,
  );

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
    setExpandedDepositRowId(null);
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
              <TableHead className={`${th} text-right`} align="right">
                New Clients
              </TableHead>
              <TableHead className={`${th} text-right`} align="right">
                Code Used
              </TableHead>
              <TableHead className={th}>1st/2nd/3rd</TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} align="right">
                Count/Deposit
              </TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} align="right">
                Count/Withdrawal
              </TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} align="right">
                Count/Bonus
              </TableHead>
              <TableHead className={`${th} text-right`} align="right">
                Net Deposit
              </TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} align="right">
                Bonus Activated
              </TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} align="right">
                Bonus Redeem
              </TableHead>
              <TableHead className={`${th} text-right whitespace-nowrap`} align="right">
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
                    const depositExpanded = expandedDepositRowId === r.id;
                    return (
                      <Fragment key={r.id}>
                        <TableRow>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateCell(r.date)}
                        </TableCell>
                        <TableCell className="text-sm">{r.agentName ?? "—"}</TableCell>
                        <TableCell align="right" className="text-sm tabular-nums">
                          <span className="inline-flex items-center justify-end gap-1">
                            {nNew}
                            {nNew > 0 ? (
                              <Users className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                            ) : null}
                          </span>
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-sm">
                          {nCode}
                        </TableCell>
                        <TableCell className="min-w-[7rem] text-sm">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDepositRowId((prev) =>
                                prev === r.id ? null : r.id,
                              )
                            }
                            className="flex w-full min-w-0 items-center justify-between gap-2 rounded-sm py-0.5 text-left hover:bg-surface-muted/60"
                            aria-expanded={depositExpanded}
                            aria-label="Show 1st 2nd 3rd deposit details"
                          >
                            <DepositTierCounts first={d1} second={d2} third={d3} />
                            <ChevronsRight
                              className={`h-4 w-4 shrink-0 text-primary transition-transform ${depositExpanded ? "rotate-90" : ""}`}
                              aria-hidden
                            />
                          </button>
                        </TableCell>
                        <TableCell align="right" className="text-sm">
                          <CountSlashAmount
                            count={Number(r.depositCount) || 0}
                            amount={Number(r.deposit) || 0}
                          />
                        </TableCell>
                        <TableCell align="right" className="text-sm">
                          <CountSlashAmount
                            count={Number(r.withdrawalCount) || 0}
                            amount={Number(r.withdrawal) || 0}
                          />
                        </TableCell>
                        <TableCell align="right" className="text-sm">
                          <CountSlashAmount
                            count={Number(r.bonusCount) || 0}
                            amount={Number(r.bonus) || 0}
                          />
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-sm text-foreground">
                          {formatCurrency(r.netDeposit)}
                        </TableCell>
                        <TableCell align="right" className="text-sm">
                          <BonusAmount value={Number(r.bonusActivated) || 0} />
                        </TableCell>
                        <TableCell align="right" className="text-sm">
                          <BonusAmount value={Number(r.bonusRedeem) || 0} />
                        </TableCell>
                        <TableCell align="right" className="text-sm">
                          <BonusAmount value={Number(r.bonusExpired) || 0} />
                        </TableCell>
                        </TableRow>
                        {depositExpanded ? (
                          <TableRow className="bg-surface-muted/30">
                            <td colSpan={12} className="p-0">
                              <div className="px-4 py-3 sm:pl-10">
                                <DepositTierExpandPanel row={r} />
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
                    <TableCell align="right" className="tabular-nums text-sm">
                      <span className="inline-flex items-center justify-end gap-1">
                        {totals.newClients}
                        {totals.newClients > 0 ? (
                          <Users className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell align="right" className="tabular-nums text-sm">
                      {totals.codeUsed}
                    </TableCell>
                    <TableCell className="min-w-[7rem] text-sm">
                      <DepositTierCounts
                        first={totals.first}
                        second={totals.second}
                        third={totals.third}
                      />
                    </TableCell>
                    <TableCell align="right" className="text-sm">
                      <CountSlashAmount
                        count={totals.depositCount}
                        amount={totals.deposit}
                      />
                    </TableCell>
                    <TableCell align="right" className="text-sm">
                      <CountSlashAmount
                        count={totals.withdrawalCount}
                        amount={totals.withdrawal}
                      />
                    </TableCell>
                    <TableCell align="right" className="text-sm">
                      <CountSlashAmount count={totals.bonusCount} amount={totals.bonus} />
                    </TableCell>
                    <TableCell align="right" className="tabular-nums text-sm">
                      {formatCurrency(totals.netDeposit)}
                    </TableCell>
                    <TableCell align="right" className="text-sm">
                      <BonusAmount value={totals.bonusActivated} />
                    </TableCell>
                    <TableCell align="right" className="text-sm">
                      <BonusAmount value={totals.bonusRedeem} />
                    </TableCell>
                    <TableCell align="right" className="text-sm">
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
