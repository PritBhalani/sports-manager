"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
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
import { todayRangeUTC, dateRangeToISO } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import {
  getFdProfitLoss,
  type FdProfitLossRow,
} from "@/services/fdstudio.service";

const PAGE_SIZE = 50;

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

function buildCsv(rows: FdProfitLossRow[]): string {
  const header = ["User", "PL"].join(",");
  const lines = [header];
  for (const r of rows) {
    const u = r.user ?? {};
    const userCell = `${String(u.username ?? "")} (${String(u.userCode ?? "")})`;
    lines.push([csvEscape(userCell), csvNumber(Number(r.win) || 0)].join(","));
  }
  return lines.join("\r\n");
}

export default function FdGameReportPage() {
  const [items, setItems] = useState<FdProfitLossRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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
    getFdProfitLoss(
      {
        page,
        pageSize,
        groupBy: "user",
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
        setError(e instanceof Error ? e.message : "Failed to load Casino game report.");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, fromDate, toDate, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    return items.reduce((acc, r) => acc + (Number(r.win) || 0), 0);
  }, [items]);

  const onDownloadCsv = () => {
    if (items.length === 0) return;
    const blob = new Blob([`\uFEFF${buildCsv(items)}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fd-game-report-${fromDate}-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="P&L Report By Casino Game"
        breadcrumbs={["Reports", "Casino Game Report"]}
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
                <TableHead className="!px-6 !py-3 !text-left">USER</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">TABLE WISE PL</TableHead>
                <TableHead className="!px-6 !py-3 !text-right">PL</TableHead>
              </TableHeader>
              <TableBody>
            {loading ? (
              <TableEmpty colSpan={3} message="Loading…" />
            ) : items.length === 0 ? (
              <TableEmpty colSpan={3} message="No data for this range." />
            ) : (
              <>
                {items.map((r) => {
                  const playerId = String(r.user?.id ?? "").trim();
                  return (
                  <TableRow key={r.user?.id ?? `${r.user?.userCode}-${r.createdOn}`}>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default">Member</Badge>
                        {playerId ? (
                          <Link
                            href={`/players/${encodeURIComponent(playerId)}?tab=fd-betting-pl`}
                            className="font-medium text-primary hover:underline"
                          >
                            <span>{r.user?.username ?? "—"}</span>
                            <span className="text-primary/80">
                              ({r.user?.userCode ?? "—"})
                            </span>
                          </Link>
                        ) : (
                          <>
                            <span className="font-medium text-foreground">
                              {r.user?.username ?? "—"}
                            </span>
                            <span className="text-muted">
                              ({r.user?.userCode ?? "—"})
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-primary">Table Wise PL</span>
                    </TableCell>
                    <TableCell  className={`tabular-nums ${signedAmountTextClass(Number(r.win ?? 0))}`}>
                      {formatCurrency(r.win)}
                    </TableCell>
                  </TableRow>
                  );
                })}
                <TableRow className="bg-surface-muted/50 font-medium">
                  <TableCell>Total</TableCell>
                  <TableCell> </TableCell>
                  <TableCell  className={`tabular-nums ${signedAmountTextClass(totals)}`}>
                    {formatCurrency(totals)}
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

