"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Button,
  TablePagination,
} from "@/components";
import { Download } from "lucide-react";
import {
  getPlByAgent,
  type PlByAgentRound,
  type PlByAgentUserPl,
} from "@/services/betHistory.service";
import { todayRangeUTC, dateRangeToISO } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

const PAGE_SIZE = 50;

function sumUserPls(userPls: PlByAgentUserPl[]) {
  return userPls.reduce(
    (a, u) => ({
      win: a.win + (Number(u.win) || 0),
      comm: a.comm + (Number(u.comm) || 0),
      netWin: a.netWin + (Number(u.netWin) || 0),
    }),
    { win: 0, comm: 0, netWin: 0 },
  );
}

function formatSettleDateDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dateKeyFromSettle(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function MemberAmount({ value }: { value: number }) {
  const formatted = formatCurrency(value);
  return <span className="tabular-nums text-foreground">{formatted}</span>;
}

function UplineAmount({ value }: { value: number }) {
  const formatted = formatCurrency(value);
  return <span className="tabular-nums text-foreground">{formatted}</span>;
}

/** Match exported Excel: `P&L Report By Agent.xls` (HTML) — 12 columns, two header rows */

function csvNumber(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  const r = Math.round(x * 1e6) / 1e6;
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  return String(r);
}

function buildCsv(rows: PlByAgentRound[]): string {
  const row1 = [
    ...Array(6).fill(""),
    "Member",
    "",
    "Agent",
    "",
    "",
    "Upline",
  ].join(",");
  const row2 = [
    "Date",
    "Sport",
    "Competition",
    "Event",
    "Member Login Name",
    "Member ID",
    "Net Win",
    "Comm",
    "Win",
    "Comm",
    "P&L",
    "",
  ].join(",");
  const lines = [row1, row2];

  for (const r of rows) {
    const dateStr = formatSettleDateDisplay(r.settleTime);
    const sport = r.eventTypeName ?? "";
    const competition = r.competitionName ?? "";
    const eventCell = `${r.eventName} # ${r.roundId}`;
    for (const u of r.userPls) {
      const nw = Number(u.netWin) || 0;
      const w = Number(u.win) || 0;
      const c = Number(u.comm) || 0;
      lines.push(
        [
          csvEscape(dateStr),
          csvEscape(sport),
          csvEscape(competition),
          csvEscape(eventCell),
          csvEscape(u.user.username ?? ""),
          "",
          csvNumber(nw),
          "",
          csvNumber(w),
          csvNumber(c),
          csvNumber(nw),
          "",
        ].join(","),
      );
    }
  }
  return lines.join("\r\n");
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function PlByAgentPage() {
  const [items, setItems] = useState<PlByAgentRound[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [parentId, setParentId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

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
    getPlByAgent(
      {
        page,
        pageSize,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { fromDate: fromISO, toDate: toISO },
      parentId.trim() || undefined,
    )
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e) => {
        setItems([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load P&L by agent.");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, fromDate, toDate, parentId, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const gross = useMemo(() => {
    return items.reduce(
      (acc, r) => {
        const s = sumUserPls(r.userPls);
        return {
          win: acc.win + s.win,
          comm: acc.comm + s.comm,
          netWin: acc.netWin + s.netWin,
        };
      },
      { win: 0, comm: 0, netWin: 0 },
    );
  }, [items]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, PlByAgentRound[]>();
    const order: string[] = [];
    for (const r of items) {
      const key = dateKeyFromSettle(r.settleTime);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(r);
    }
    order.sort((a, b) => b.localeCompare(a));
    return order.map((key) => ({
      key,
      label: map.get(key)?.[0] ? formatSettleDateDisplay(map.get(key)![0].settleTime) : key,
      rounds: [...map.get(key)!].sort(
        (a, b) => Date.parse(b.settleTime) - Date.parse(a.settleTime),
      ),
    }));
  }, [items]);

  const onDownloadCsv = () => {
    if (items.length === 0) return;
    const blob = new Blob([`\uFEFF${buildCsv(items)}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pl-by-agent-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tableWrap =
    "overflow-x-auto rounded-sm border border-border bg-surface";
  /** Vertical rules only: detail | member (win/comm/p&l) | upline */
  const vDetail = "border-r border-border";
  const vMemberEnd = "border-r border-border";
  const thBase =
    "px-3 py-3 text-xs font-semibold uppercase tracking-wider text-foreground-tertiary sm:px-4 border-0";
  const tdBase = "px-3 py-2.5 text-sm align-top sm:px-4 border-0";
  const tdDetail = `${tdBase} ${vDetail} min-w-[14rem] max-w-md`;
  const tdMember = `${tdBase} text-right`;
  const tdUpline = `${tdBase} text-right`;

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="P&L Report By Agent"
        breadcrumbs={["Reports", "P&L by Agent"]}
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

      <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="max-w-[160px]"
          aria-label="From date"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="max-w-[160px]"
          aria-label="To date"
        />
        <Button
          variant="primary"
          type="button"
          onClick={() => {
            setPage(1);
            setRefreshKey((k) => k + 1);
          }}
        >
          Apply
        </Button>
      </FilterBar>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <ListTableSection className={tableWrap}>
          <table className="min-w-full border-collapse [&_tr]:border-0 [&_td]:border-b-0 [&_th]:border-b-0">
            <thead className="bg-surface-muted/80">
              <tr>
                <th
                  className={`${thBase} ${vDetail} text-right text-foreground-tertiary`}
                  rowSpan={2}
                />
                <th className={`${thBase} ${vMemberEnd} text-center`} colSpan={3}>
                  Member
                </th>
                <th className={`${thBase} text-right`} rowSpan={2}>
                  Upline
                </th>
              </tr>
              <tr>
                <th className={`${thBase} text-right`}>Win</th>
                <th className={`${thBase} text-right`}>Comm</th>
                <th className={`${thBase} ${vMemberEnd} text-right`}>P&L</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-sm text-muted">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-sm text-muted">
                    No P&L data for this range.
                  </td>
                </tr>
              ) : (
                <>
                  <tr className="font-medium">
                    <td className={`${tdDetail} text-right text-foreground`}>
                      Gross Total
                    </td>
                    <td className={tdMember}>
                      <MemberAmount value={gross.win} />
                    </td>
                    <td className={tdMember}>
                      <MemberAmount value={gross.comm} />
                    </td>
                    <td className={`${tdMember} ${vMemberEnd}`}>
                      <MemberAmount value={gross.netWin} />
                    </td>
                    <td className={tdUpline}>
                      <UplineAmount value={-gross.netWin} />
                    </td>
                  </tr>
                  {groupedByDate.map(({ key, rounds }) => {
                    const daySum = rounds.reduce(
                      (acc, r) => {
                        const s = sumUserPls(r.userPls);
                        return {
                          win: acc.win + s.win,
                          comm: acc.comm + s.comm,
                          netWin: acc.netWin + s.netWin,
                        };
                      },
                      { win: 0, comm: 0, netWin: 0 },
                    );
                    return (
                      <Fragment key={key}>
                        {rounds.map((r) => {
                          const agg = sumUserPls(r.userPls);
                          const eventTitle = `${r.eventName} - ${r.marketName} ${r.roundId}`;
                          const dateLine = formatSettleDateDisplay(r.settleTime);
                          return (
                            <Fragment key={`${r.roundId}-${r.marketId}`}>
                              <tr>
                                <td className={tdDetail}>
                                  <div className="rounded-sm border border-primary/30 bg-primary/5 py-2 pl-3 pr-2 ring-1 ring-inset ring-primary/15 dark:bg-primary/10">
                                    <div className="text-xs font-semibold text-primary">
                                      {dateLine}
                                    </div>
                                    <div className="mt-1 text-sm font-medium text-foreground">
                                      {eventTitle}
                                    </div>
                                  </div>
                                </td>
                                <td className={tdMember}>
                                  <MemberAmount value={agg.win} />
                                </td>
                                <td className={tdMember}>
                                  <MemberAmount value={agg.comm} />
                                </td>
                                <td className={`${tdMember} ${vMemberEnd}`}>
                                  <MemberAmount value={agg.netWin} />
                                </td>
                                <td className={tdUpline}>
                                  <UplineAmount value={-agg.netWin} />
                                </td>
                              </tr>
                              {r.userPls.map((u) => (
                                <tr key={u.user.id}>
                                  <td className={`${tdDetail} pl-4 text-sm text-foreground`}>
                                    <span>{u.user.username}</span>
                                    <span className="text-muted">
                                      {" "}
                                      ({u.user.userCode})
                                    </span>
                                    <span className="text-muted"> | </span>
                                    <Link
                                      href={`/reports/bet-history?roundId=${r.roundId}`}
                                      className="text-primary hover:underline"
                                    >
                                      View Bets
                                    </Link>
                                  </td>
                                  <td className={tdMember}>
                                    <MemberAmount value={u.win} />
                                  </td>
                                  <td className={tdMember}>
                                    <MemberAmount value={u.comm} />
                                  </td>
                                  <td className={`${tdMember} ${vMemberEnd}`}>
                                    <MemberAmount value={u.netWin} />
                                  </td>
                                  <td className={tdUpline}>
                                    <UplineAmount value={-u.netWin} />
                                  </td>
                                </tr>
                              ))}
                            </Fragment>
                          );
                        })}
                        <tr className="font-medium">
                          <td className={`${tdDetail} text-right text-foreground`}>
                            Total
                          </td>
                          <td className={tdMember}>
                            <MemberAmount value={daySum.win} />
                          </td>
                          <td className={tdMember}>
                            <MemberAmount value={daySum.comm} />
                          </td>
                          <td className={`${tdMember} ${vMemberEnd}`}>
                            <MemberAmount value={daySum.netWin} />
                          </td>
                          <td className={tdUpline}>
                            <UplineAmount value={-daySum.netWin} />
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
          </ListTableSection>
          {!loading && total > 0 ? (
            <div className="px-4 py-3 pt-4">
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
            </div>
          ) : null}
        </div>
      </ListPageFrame>
    </div>
  );
}
