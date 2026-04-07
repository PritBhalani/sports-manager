"use client";

import { useState, useEffect, useCallback } from "react";
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
import { getLiveBets } from "@/services/bet.service";
import { todayRangeUTC } from "@/utils/date";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { downloadCsv } from "@/utils/csvDownload";

const PAGE_SIZE = 15;

export default function LiveBetsPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    const fromISO = new Date(fromDate + "T00:00:00.000Z").toISOString();
    const toISO = new Date(toDate + "T23:59:59.999Z").toISOString();
    setLoading(true);
    getLiveBets(
      { page, pageSize, orderByDesc: true },
      { fromDate: fromISO, toDate: toISO, status: "matched" }
    )
      .then((res) => {
        setData((res.items ?? []) as Record<string, unknown>[]);
        setTotal(res.total ?? 0);
      })
      .catch(() => {
        setData([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, fromDate, toDate]);

  const exportLiveBetsCsv = useCallback(() => {
    downloadCsv(
      `live-bets-${fromDate}-${toDate}.csv`,
      ["Event / Market", "Selection", "Stake", "Odds", "Status", "Date"],
      data.map((row) => [
        String(row.eventName ?? row.marketName ?? ""),
        String(row.selection ?? row.runnerName ?? ""),
        Number(row.stake ?? 0),
        String(row.odds ?? ""),
        String(row.status ?? ""),
        formatDateTime(row.createdAt ?? row.date),
      ]),
    );
  }, [data, fromDate, toDate]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Live Bets"
        breadcrumbs={["Bets", "Live"]}
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
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => {
                  setPage(1);
                }}
              >
                Search
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={exportLiveBetsCsv}
                disabled={loading || data.length === 0}
              >
                Export
              </Button>
            </div>
          </FilterBar>

          <ListTableSection>
            <Table className="w-full min-w-max rounded-lg">
              <TableHeader className="w-full bg-white uppercase">
                <TableHead className="!px-6 !py-3 !text-left">EVENT / MARKET</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">SELECTION</TableHead>
                <TableHead className="!px-6 !py-3 !text-right">STAKE</TableHead>
                <TableHead className="!px-6 !py-3 !text-right">ODDS</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">STATUS</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">DATE</TableHead>
              </TableHeader>
              <TableBody>
            {loading ? (
              <TableEmpty colSpan={6} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={6} message="No live bets." />
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{String(row.eventName ?? row.marketName ?? "—")}</TableCell>
                  <TableCell>{String(row.selection ?? row.runnerName ?? "—")}</TableCell>
                  <TableCell align="right">{formatCurrency(row.stake)}</TableCell>
                  <TableCell align="right">{String(row.odds ?? "—")}</TableCell>
                  <TableCell>{String(row.status ?? "—")}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt ?? row.date)}</TableCell>
                </TableRow>
              ))
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
