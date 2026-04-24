"use client";

import Link from "next/link";
import { Fragment, useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { todayRangeUTC, dateRangeToISO, formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";

const PAGE_SIZE = 50;
/** User type with no further P&L-by-agent downline (e.g. end player). */
const NO_DRILLDOWN_USER_TYPE = 5;

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
  return formatDateTime(iso);
}

function dateKeyFromSettle(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Section header like legacy report: `23/04/2026` */
function formatDateSectionHeader(iso: string, fallbackKey: string): string {
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  const d2 = new Date(`${fallbackKey}T12:00:00`);
  if (!Number.isNaN(d2.getTime())) {
    const dd = String(d2.getDate()).padStart(2, "0");
    const mm = String(d2.getMonth() + 1).padStart(2, "0");
    const yyyy = String(d2.getFullYear());
    return `${dd}/${mm}/${yyyy}`;
  }
  return fallbackKey;
}

function MemberAmount({ value }: { value: number }) {
  const formatted = formatCurrency(value);
  return (
    <span className={`tabular-nums ${signedAmountTextClass(value)}`}>{formatted}</span>
  );
}

function UplineAmount({ value }: { value: number }) {
  const formatted = formatCurrency(value);
  return (
    <span className={`tabular-nums ${signedAmountTextClass(value)}`}>{formatted}</span>
  );
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

function PlByAgentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromQ = searchParams.get("from")?.trim() ?? "";
  const toQ = searchParams.get("to")?.trim() ?? "";

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
    if (fromQ && toQ) {
      setFromDate(fromQ);
      setToDate(toQ);
    } else {
      const range = todayRangeUTC();
      setFromDate(range.fromDate.slice(0, 10));
      setToDate(range.toDate.slice(0, 10));
    }
  }, [fromQ, toQ]);

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
            const q = new URLSearchParams();
            if (fromDate.trim()) q.set("from", fromDate.trim());
            if (toDate.trim()) q.set("to", toDate.trim());
            const qs = q.toString();
            router.replace(`/reports/pl-by-agent${qs ? `?${qs}` : ""}`, { scroll: false });
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
                  <tr className="border-b-2 border-border font-medium bg-surface-muted/40">
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
                    const dateBanner = formatDateSectionHeader(
                      rounds[0]?.settleTime ?? "",
                      key,
                    );
                    return (
                      <Fragment key={key}>
                        <tr className="border-t border-border bg-surface-2">
                          <td
                            colSpan={5}
                            className="px-4 py-2.5 text-sm font-semibold text-foreground"
                          >
                            {dateBanner}
                          </td>
                        </tr>
                        {rounds.map((r) => {
                          const agg = sumUserPls(r.userPls);
                          const eventTitle = `${r.eventName} - ${r.marketName} ${r.roundId}`;
                          return (
                            <Fragment key={`${r.roundId}-${r.marketId}`}>
                              <tr className="bg-surface-muted/30">
                                <td className={tdDetail}>
                                  <div className="rounded-sm border border-primary/30 bg-primary/5 py-2 pl-3 pr-2 ring-1 ring-inset ring-primary/15 dark:bg-primary/10">
                                    <div className="text-sm font-medium text-foreground">
                                      {eventTitle}
                                    </div>
                                  </div>
                                </td>
                                <td className={`${tdMember} text-muted`}>—</td>
                                <td className={`${tdMember} text-muted`}>—</td>
                                <td className={`${tdMember} ${vMemberEnd} text-muted`}>—</td>
                                <td className={`${tdUpline} text-muted`}>—</td>
                              </tr>
                              {r.userPls.map((u) => {
                                const ut = u.user.userType ?? 0;
                                const drillQs = new URLSearchParams();
                                if (fromDate.trim()) drillQs.set("from", fromDate.trim());
                                if (toDate.trim()) drillQs.set("to", toDate.trim());
                                const drillQ = drillQs.toString();
                                const drillHref = `/reports/pl-by-agent/${encodeURIComponent(u.user.id)}/${ut}${drillQ ? `?${drillQ}` : ""}`;
                                return (
                                <tr key={u.user.id} className="bg-surface">
                                  <td className={`${tdDetail} pl-4 text-sm text-foreground`}>
                                    {ut === NO_DRILLDOWN_USER_TYPE ? (
                                      <span className="font-medium text-foreground">
                                        {u.user.username}
                                        <span className="text-foreground-secondary">
                                          {" "}
                                          ({u.user.userCode})
                                        </span>
                                      </span>
                                    ) : (
                                      <Link
                                        href={drillHref}
                                        className="text-primary hover:underline"
                                      >
                                        <span className="font-medium">{u.user.username}</span>
                                        <span className="text-primary/80"> ({u.user.userCode})</span>
                                      </Link>
                                    )}
                                    <span className="text-muted"> | </span>
                                    <Link
                                      href={`/reports/pl-by-agent/market-bets/${encodeURIComponent(r.marketId)}?memberId=${encodeURIComponent(u.user.id)}`}
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
                                );
                              })}
                              <tr className="border-t border-border bg-surface-muted/60 font-medium">
                                <td className={`${tdDetail} text-right text-foreground`}>
                                  Total
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
                            </Fragment>
                          );
                        })}
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

export default function PlByAgentPage() {
  return (
    <Suspense fallback={<div className="px-4 py-8 text-sm text-muted">Loading…</div>}>
      <PlByAgentPageInner />
    </Suspense>
  );
}
