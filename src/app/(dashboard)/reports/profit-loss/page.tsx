"use client";

import { useState, useEffect } from "react";
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
import { getPlStatement } from "@/services/account.service";
import { usePagination } from "@/hooks/usePagination";
import { getSessionMemberId } from "@/services/user.service";
import { todayRangeUTC, dateRangeToISO, formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

export default function ProfitLossPage() {
  const { page, pageSize, setPage, setPageSize, pageSizeOptions } = usePagination();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    const userId = getSessionMemberId();
    if (!userId) {
      setError("Not logged in or missing user id.");
      setLoading(false);
      return;
    }
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
    setError(null);
    setLoading(true);
    getPlStatement(
      { page, pageSize, orderByDesc: true },
      { fromDate: fromISO, toDate: toISO },
      userId
    )
      .then((res) => {
        const list = res?.data ?? [];
        setData(Array.isArray(list) ? list : []);
        setTotal(res?.total ?? 0);
      })
      .catch((e) => {
        setData([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load P&L data.");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, fromDate, toDate]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Profit & Loss"
        breadcrumbs={["Reports", "Profit & Loss"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />
      {error && (
        <p className="mb-2 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
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
          </FilterBar>
          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>Date</TableHead>
            <TableHead>Market / Event</TableHead>
            <TableHead align="right">Stake</TableHead>
            <TableHead align="right">P&amp;L</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={4} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={4} message="No P&amp;L data yet." />
            ) : (
              data.map((row, i) => (
                <TableRow key={String(row.id ?? row.statementId ?? i)}>
                  <TableCell>{formatDateTime(row.date ?? row.createdAt)}</TableCell>
                  <TableCell>{String(row.marketName ?? row.eventName ?? "—")}</TableCell>
                  <TableCell align="right">{formatCurrency(row.stake)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.pl ?? row.profitLoss)}</TableCell>
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
              onPageSizeChange={setPageSize}
              pageSizeOptions={pageSizeOptions}
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
