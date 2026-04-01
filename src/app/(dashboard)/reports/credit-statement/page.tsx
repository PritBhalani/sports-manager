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
import { getCreditStatement } from "@/services/account.service";
import { getSessionMemberId } from "@/services/user.service";
import { todayRangeUTC } from "@/utils/date";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

const PAGE_SIZE = 15;

export default function CreditStatementPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const range = todayRangeUTC();
    if (!fromDate) setFromDate(range.fromDate.slice(0, 10));
    if (!toDate) setToDate(range.toDate.slice(0, 10));
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    const userId = getSessionMemberId();
    if (!userId) {
      setData([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const fromISO = new Date(fromDate + "T00:00:00.000Z").toISOString();
    const toISO = new Date(toDate + "T23:59:59.999Z").toISOString();
    setLoading(true);
    getCreditStatement(
      { page, pageSize, orderByDesc: true },
      { fromDate: fromISO, toDate: toISO },
      userId
    )
      .then((res) => {
        const list = res?.data ?? [];
        setData(Array.isArray(list) ? list : []);
        setTotal(res?.total ?? 0);
      })
      .catch(() => {
        setData([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, fromDate, toDate]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Credit Statement"
        breadcrumbs={["Bonus", "Statement"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />
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
            <Button variant="primary">Apply</Button>
          </FilterBar>
          <ListTableSection>
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
              <TableEmpty colSpan={5} message="No credit statement data yet." />
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>
                    {formatDateTime(row.date ?? row.createdAt ?? row.timestamp)}
                  </TableCell>
                  <TableCell>{String(row.description ?? row.comment ?? "—")}</TableCell>
                  <TableCell align="right">{formatCurrency(row.credit ?? row.amount)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.debit)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.balance)}</TableCell>
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
