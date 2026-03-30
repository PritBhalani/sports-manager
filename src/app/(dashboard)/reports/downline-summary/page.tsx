"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronsRight, Download } from "lucide-react";
import {
  PageHeader,
  Card,
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
  Badge,
} from "@/components";
import {
  getDownlineSummary,
  getDownlineSummaryDetails,
  type DownlineSummaryDetailRow,
  type DownlineSummaryRow,
} from "@/services/betHistory.service";
import { todayRangeUTC, dateRangeToISO } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

const PAGE_SIZE = 50;

function userTypeLabel(userType: number | undefined): string {
  if (userType === undefined || Number.isNaN(userType)) return "User";
  if (userType === 5) return "Member";
  if (userType === 1 || userType === 0) return "Admin";
  return "User";
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvNumber(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  const r = Math.round(x * 1e6) / 1e6;
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  return String(r);
}

function buildCsv(rows: DownlineSummaryRow[]): string {
  const header = ["Name", "Stake", "PL", "Commission"].join(",");
  const lines = [header];
  for (const r of rows) {
    const name = r.user?.username ?? r.user?.userCode ?? "";
    lines.push(
      [
        csvEscape(name),
        csvNumber(Number(r.to) || 0),
        csvNumber(Number(r.win) || 0),
        csvNumber(Number(r.comm) || 0),
      ].join(","),
    );
  }
  return lines.join("\r\n");
}

export default function AgentPlSummaryPage() {
  const [items, setItems] = useState<DownlineSummaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [detailsByUserId, setDetailsByUserId] = useState<
    Record<string, DownlineSummaryDetailRow[]>
  >({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});
  const [detailsError, setDetailsError] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  useEffect(() => {
    setExpanded({});
    setDetailsByUserId({});
    setDetailsLoading({});
    setDetailsError({});
  }, [fromDate, toDate, refreshKey]);

  const load = useCallback(() => {
    if (!fromDate || !toDate) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
    setLoading(true);
    setError(null);
    getDownlineSummary(
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
        setError(e instanceof Error ? e.message : "Failed to load agent P&L summary.");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, fromDate, toDate, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = useCallback(
    async (userId: string) => {
      setExpanded((prev) => ({ ...prev, [userId]: !prev[userId] }));

      if (expanded[userId]) return;
      if (detailsByUserId[userId] !== undefined) return;
      if (detailsLoading[userId]) return;
      if (!fromDate || !toDate) return;

      const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
      setDetailsLoading((prev) => ({ ...prev, [userId]: true }));
      setDetailsError((prev) => ({ ...prev, [userId]: null }));
      try {
        const rows = await getDownlineSummaryDetails(userId, {
          fromDate: fromISO,
          toDate: toISO,
        });
        setDetailsByUserId((prev) => ({ ...prev, [userId]: rows }));
      } catch (e) {
        setDetailsByUserId((prev) => ({ ...prev, [userId]: [] }));
        setDetailsError((prev) => ({
          ...prev,
          [userId]: e instanceof Error ? e.message : "Failed to load details.",
        }));
      } finally {
        setDetailsLoading((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [expanded, detailsByUserId, detailsLoading, fromDate, toDate],
  );

  const totals = useMemo(() => {
    return items.reduce(
      (acc, r) => ({
        stake: acc.stake + (Number(r.to) || 0),
        pl: acc.pl + (Number(r.win) || 0),
        comm: acc.comm + (Number(r.comm) || 0),
      }),
      { stake: 0, pl: 0, comm: 0 },
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
    a.download = `agent-pl-summary-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rowCountLabel =
    total === 1 ? "1 row found" : `${total.toLocaleString()} rows found`;

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="Agent P&L Summary"
        breadcrumbs={["Reports", "Agent P&L Summary"]}
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

      <FilterBar className="flex flex-wrap items-center gap-3">
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

      <p className="text-sm text-muted">{rowCountLabel}</p>

      <Card>
        <Table>
          <TableHeader>
            <TableHead>Name</TableHead>
            <TableHead align="right">Stake</TableHead>
            <TableHead align="right">PL</TableHead>
            <TableHead align="right">Commission</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={4} message="Loading…" />
            ) : items.length === 0 ? (
              <TableEmpty colSpan={4} message="No data for this range." />
            ) : (
              <>
                {items.map((row) => {
                  const u = row.user;
                  const uid = u?.id ?? "";
                  const label = userTypeLabel(
                    typeof u?.userType === "number" ? u.userType : undefined,
                  );
                  const isOpen = Boolean(expanded[uid]);
                  const detailRows = detailsByUserId[uid] ?? [];
                  const detailLoading = Boolean(detailsLoading[uid]);
                  const detailErr = detailsError[uid];

                  const detailTotals = detailRows.reduce<{
                    stake: number;
                    pl: number;
                    comm: number;
                  }>(
                    (acc, d) => ({
                      stake: acc.stake + (Number(d.stake) || 0),
                      pl: acc.pl + (Number(d.netPl) || 0),
                      comm: acc.comm + (Number(d.commission) || 0),
                    }),
                    { stake: 0, pl: 0, comm: 0 },
                  );

                  return (
                    <Fragment key={uid || `${u?.userCode}-${row.roundId}`}>
                      <TableRow>
                        <TableCell>
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <Badge variant="default">{label}</Badge>
                            <span className="font-medium text-foreground">
                              {u?.username ?? "—"}
                            </span>
                            {uid ? (
                              <button
                                type="button"
                                onClick={() => void toggleExpand(uid)}
                                className={`inline-flex shrink-0 items-center rounded-sm text-primary transition-transform hover:bg-surface-muted/80 ${isOpen ? "rotate-90" : ""}`}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? "Collapse" : "Expand"} details for ${u?.username ?? "user"}`}
                              >
                                <ChevronsRight className="h-4 w-4" aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-foreground">
                          {formatCurrency(row.to)}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-foreground">
                          {formatCurrency(row.win)}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-foreground">
                          {formatCurrency(row.comm)}
                        </TableCell>
                      </TableRow>

                      {isOpen && uid ? (
                        <TableRow className="bg-surface-muted/30">
                          <td colSpan={4} className="p-0">
                            <div className="px-4 py-3">
                              {detailErr ? (
                                <p className="text-sm text-error" role="alert">
                                  {detailErr}
                                </p>
                              ) : detailLoading ? (
                                <p className="text-sm text-muted">Loading details…</p>
                              ) : detailRows.length === 0 ? (
                                <p className="text-sm text-muted">No breakdown for this user.</p>
                              ) : (
                                <div className="overflow-x-auto rounded-sm border border-border bg-surface">
                                  <table className="min-w-full border-collapse text-sm">
                                    <thead className="bg-surface-muted/60">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                          EventType
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                          Stake
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                          PL
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                          Commission
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detailRows.map((d, idx) => (
                                        <tr
                                          key={`${d.eventTypeName ?? "et"}-${idx}`}
                                          className="border-t border-border"
                                        >
                                          <td className="px-3 py-2 text-foreground">
                                            {d.eventTypeName ?? "—"}
                                          </td>
                                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                                            {formatCurrency(d.stake)}
                                          </td>
                                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                                            {formatCurrency(d.netPl)}
                                          </td>
                                          <td className="px-3 py-2 text-right tabular-nums text-foreground">
                                            {formatCurrency(d.commission)}
                                          </td>
                                        </tr>
                                      ))}
                                      <tr className="border-t border-border font-medium">
                                        <td className="px-3 py-2 text-foreground">Total</td>
                                        <td className="px-3 py-2 text-right tabular-nums text-foreground">
                                          {formatCurrency(detailTotals.stake)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-foreground">
                                          {formatCurrency(detailTotals.pl)}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums text-foreground">
                                          {formatCurrency(detailTotals.comm)}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
                <TableRow className="bg-surface-muted/50 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell align="right" className="tabular-nums text-foreground">
                    {formatCurrency(totals.stake)}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums text-foreground">
                    {formatCurrency(totals.pl)}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums text-foreground">
                    {formatCurrency(totals.comm)}
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
      </Card>
    </div>
  );
}
