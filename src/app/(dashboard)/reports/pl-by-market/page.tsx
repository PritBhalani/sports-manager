"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, Fragment } from "react";
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
  Badge,
} from "@/components";
import {
  getPlByMarket,
  getPlByMarketDetails,
  type PlByMarketRow,
} from "@/services/betHistory.service";
import { todayRangeUTC, dateRangeToISO, formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { downloadCsv } from "@/utils/csvDownload";

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

  const exportPlByMarketCsv = useCallback(() => {
    const header = [
      "Event",
      "Market",
      "Round",
      "Winner",
      "Stake",
      "P&L",
      "Commission",
      "Market time",
      "Settle time",
    ];
    const out = items.map((row) => [
      row.eventName || "",
      row.marketName || "",
      row.roundId ?? "",
      row.winner ?? "",
      Number(row.stake ?? 0),
      Number(row.pnl ?? row.win ?? 0),
      Number(row.commission ?? 0),
      row.marketTime ? formatDateTime(row.marketTime) : "",
      row.settleTime ? formatDateTime(row.settleTime) : "",
    ]);
    downloadCsv(`pl-by-market-${fromDate}-${toDate}.csv`, header, out);
  }, [items, fromDate, toDate]);

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
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="P&L by Market"
        breadcrumbs={["Reports", "P&L by Market"]}
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
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setPage(1);
                setToDate(e.target.value);
              }}
              className="max-w-[170px]"
            />
            <Input
              placeholder="Event type ID"
              value={eventTypeId}
              onChange={(e) => {
                setPage(1);
                setEventTypeId(e.target.value);
              }}
              className="max-w-[180px]"
            />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                type="button"
                size="sm"
                onClick={() => {
                  setPage(1);
                  setRefreshKey((k) => k + 1);
                }}
              >
                Apply
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={exportPlByMarketCsv}
                disabled={loading || items.length === 0}
              >
                Export
              </Button>
            </div>
          </FilterBar>

          <ListTableSection>
            <Table className="w-full min-w-max rounded-lg">
              <TableHeader className="w-full bg-white uppercase">
                <TableHead className="!px-6 !py-3 !text-left">EVENT</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">MARKET</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">WINNER</TableHead>
                <TableHead className="!px-6 !py-3 !text-right">STAKE</TableHead>
                <TableHead className="!px-6 !py-3 !text-right">PL</TableHead>
                <TableHead className="!px-6 !py-3 !text-right">COMMISSION</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">MARKETTIME</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">SETTLETIME</TableHead>
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
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
