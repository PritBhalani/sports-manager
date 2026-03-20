"use client";

import { useState, useEffect } from "react";
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
} from "@/components";
import { getAccountStatement } from "@/services/account.service";
import { usePagination } from "@/hooks/usePagination";
import { todayRangeUTC, dateRangeToISO, formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { getMyInfoPathId, getSessionMemberId } from "@/services/user.service";

export default function AccountStatementPage() {
  const { page, pageSize, setPage, setPageSize, pageSizeOptions } = usePagination();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const userId =
        getSessionMemberId() || "69803a1fda70c5ee87bf0493";  

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
    setError(null);
    setLoading(true);
    getAccountStatement(
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
        setError(e instanceof Error ? e.message : "Failed to load statement.");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, fromDate, toDate]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Account Statement"
        breadcrumbs={["Reports", "Account Statement"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />
      {error && (
        <p className="mb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
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
      </FilterBar>
      <Card>
        <Table>
          <TableHeader>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead align="right">Credit</TableHead>
            <TableHead align="right">Debit</TableHead>
            <TableHead align="right">Balance</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={5} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={5} message="No statement data yet." />
            ) : (
              data.map((row, i) => (
                <TableRow key={String(row.id ?? row.statementId ?? i)}>
                  <TableCell>
                    {formatDateTime(row.date ?? row.createdAt ?? row.timestamp)}
                  </TableCell>
                  <TableCell>
                    {String(row.description ?? row.comment ?? "—")}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(row.credit ?? row.amount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(row.debit)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(row.balance)}
                  </TableCell>
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
      </Card>
    </div>
  );
}
