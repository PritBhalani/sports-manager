"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, Fragment } from "react";
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
  getPlByMarket,
  getPlByMarketDetails,
  type PlByMarketRow,
} from "@/services/betHistory.service";
import { todayRangeUTC, dateRangeToISO, formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

const PAGE_SIZE = 15;

export default function PlByMarketPage() {
  const [items, setItems] = useState<PlByMarketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [eventTypeId, setEventTypeId] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [detailsByMarketId, setDetailsByMarketId] = useState<
    Record<string, Record<string, unknown>[]>
  >({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});
  const [detailsError, setDetailsError] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  const load = useCallback(() => {
    if (!fromDate || !toDate) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
    setLoading(true);
    getPlByMarket(
      { page, pageSize, orderByDesc: true },
      { fromDate: fromISO, toDate: toISO, eventTypeId: eventTypeId.trim() || undefined }
    )
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, fromDate, toDate, eventTypeId, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = useCallback(
    async (marketId: string) => {
      setExpanded((prev) => ({ ...prev, [marketId]: !prev[marketId] }));

      // Load only the first time we expand.
      if (expanded[marketId]) return;
      if (detailsByMarketId[marketId]) return;
      if (detailsLoading[marketId]) return;

      setDetailsLoading((prev) => ({ ...prev, [marketId]: true }));
      setDetailsError((prev) => ({ ...prev, [marketId]: null }));
      try {
        const res = await getPlByMarketDetails(marketId);
        setDetailsByMarketId((prev) => ({ ...prev, [marketId]: res ?? [] }));
      } catch (e) {
        setDetailsByMarketId((prev) => ({ ...prev, [marketId]: [] }));
        setDetailsError((prev) => ({
          ...prev,
          [marketId]:
            e instanceof Error ? e.message : "Failed to load market details.",
        }));
      } finally {
        setDetailsLoading((prev) => ({ ...prev, [marketId]: false }));
      }
    },
    [detailsByMarketId, detailsLoading, expanded],
  );

  return (
    <div className="min-w-0">
      <PageHeader
        title="P&L by Market"
        breadcrumbs={["Reports", "P&L by Market"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />
      <FilterBar className="mb-4">
        <Input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="max-w-[160px]"
        />
        <Input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="max-w-[160px]"
        />
        <Input
          placeholder="Event type ID"
          value={eventTypeId}
          onChange={(e) => setEventTypeId(e.target.value)}
          className="max-w-[160px]"
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
      <Card>
        <Table>
          <TableHeader>
            <TableHead>Event</TableHead>
            <TableHead>Market</TableHead>
            <TableHead>Winner</TableHead>
            <TableHead align="right">Stake</TableHead>
            <TableHead align="right">PL</TableHead>
            <TableHead align="right">Commission</TableHead>
            <TableHead>MarketTime</TableHead>
            <TableHead>SettleTime</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={8} message="Loading…" />
            ) : items.length === 0 ? (
              <TableEmpty colSpan={8} message="No P&L by market data yet." />
            ) : (
              items.map((row) => {
                const isExpanded = Boolean(expanded[row.marketId]);
                const detailRows = detailsByMarketId[row.marketId] ?? [];
                const isDetailLoading = Boolean(detailsLoading[row.marketId]);
                const detailErr = detailsError[row.marketId];

                return (
                  <Fragment key={`${row.marketId}-${row.roundId}`}>
                    <TableRow>
                      <TableCell>{row.eventName || "—"}</TableCell>
                      <TableCell>
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="truncate text-sm text-foreground">
                            {row.marketName || "—"}
                            {row.roundId ? (
                              <span className="text-muted"> ({row.roundId})</span>
                            ) : null}
                          </span>
                          <div className="flex flex-wrap gap-2 text-sm">
                            <Link
                              href={`/reports/pl-by-market/${encodeURIComponent(row.marketId)}`}
                              className="text-primary hover:underline"
                            >
                              Bets
                            </Link>
                            <span className="text-muted">|</span>
                            <button
                              type="button"
                              onClick={() => void toggleExpand(row.marketId)}
                              className="text-primary hover:underline"
                              aria-expanded={isExpanded}
                            >
                              {isExpanded ? "Collapse" : "Expand"}
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{row.winner ?? "—"}</TableCell>
                      <TableCell align="right" className="tabular-nums text-foreground">
                        {formatCurrency(row.stake)}
                      </TableCell>
                      <TableCell align="right" className="tabular-nums text-foreground">
                        {formatCurrency(row.pnl ?? row.win)}
                      </TableCell>
                      <TableCell align="right" className="tabular-nums text-foreground">
                        {formatCurrency(row.commission)}
                      </TableCell>
                      <TableCell>{formatDateTime(row.marketTime)}</TableCell>
                      <TableCell>{formatDateTime(row.settleTime)}</TableCell>
                    </TableRow>

                    {isExpanded ? (
                      <TableRow className="bg-surface-muted/30">
                        <td colSpan={8} className="p-0">
                          <div className="px-4 py-3">
                            {detailErr ? (
                              <p className="text-sm text-error" role="alert">
                                {String(detailErr)}
                              </p>
                            ) : isDetailLoading ? (
                              <p className="text-sm text-muted">Loading details…</p>
                            ) : detailRows.length === 0 ? (
                              <p className="text-sm text-muted">No details found.</p>
                            ) : (
                              <div className="overflow-x-auto rounded-sm border border-border bg-surface">
                                <table className="min-w-full border-collapse">
                                  <thead className="bg-surface-muted/60">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                                        Member
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
                                    {detailRows.map((d, idx) => {
                                      const user = (d.user ?? {}) as Record<string, unknown>;
                                      const username = String(user.username ?? "—");
                                      const userType = Number(user.userType ?? NaN);
                                      const badge =
                                        userType === 5 ? "Member" : "User";
                                      return (
                                        <tr key={String(user.id ?? idx)} className="border-t border-border">
                                          <td className="px-3 py-2 text-sm text-foreground">
                                            <div className="flex items-center gap-2">
                                              <Badge variant="default">{badge}</Badge>
                                              <span className="truncate">{username}</span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-2 text-right text-sm tabular-nums text-foreground">
                                            {formatCurrency(d.netWin ?? d.win)}
                                          </td>
                                          <td className="px-3 py-2 text-right text-sm tabular-nums text-foreground">
                                            {formatCurrency(d.comm)}
                                          </td>
                                        </tr>
                                      );
                                    })}
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
              })
            )}
          </TableBody>
        </Table>
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
      </Card>
    </div>
  );
}
