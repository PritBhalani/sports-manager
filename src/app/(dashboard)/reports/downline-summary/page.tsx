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
import { getDownlineSummary } from "@/services/betHistory.service";
import { getSessionMemberId } from "@/services/user.service";
import { todayRangeUTC } from "@/utils/date";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

const PAGE_SIZE = 15;

export default function DownlineSummaryPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [parentId, setParentId] = useState("");

  useEffect(() => {
    const id = getSessionMemberId();
    if (id) setParentId(id);
  }, []);

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    const scopeId = parentId.trim() || getSessionMemberId();
    if (!scopeId) {
      setData([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const fromISO = new Date(fromDate + "T00:00:00.000Z").toISOString();
    const toISO = new Date(toDate + "T23:59:59.999Z").toISOString();
    setLoading(true);
    getDownlineSummary(
      { page, pageSize, orderByDesc: true },
      { fromDate: fromISO, toDate: toISO },
      scopeId
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
  }, [page, pageSize, fromDate, toDate, parentId]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Downline Summary"
        breadcrumbs={["Bonus", "Claims"]}
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
          placeholder="Parent ID"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="max-w-[180px]"
        />
        <Button variant="primary">Apply</Button>
      </FilterBar>
      <Card>
        <Table>
          <TableHeader>
            <TableHead>User / Agent</TableHead>
            <TableHead>Date</TableHead>
            <TableHead align="right">Stake</TableHead>
            <TableHead align="right">P&L</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={4} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={4} message="No downline summary yet." />
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{String(row.username ?? row.userCode ?? row.userId ?? "—")}</TableCell>
                  <TableCell>{formatDateTime(row.date ?? row.createdAt)}</TableCell>
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
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </Card>
    </div>
  );
}
