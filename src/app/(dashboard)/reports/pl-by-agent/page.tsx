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
import { getPlByAgent } from "@/services/betHistory.service";
import { todayRangeUTC } from "@/utils/date";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

const PAGE_SIZE = 15;

export default function PlByAgentPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [parentId, setParentId] = useState("");

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
    getPlByAgent(
      { page, pageSize, orderByDesc: true },
      { fromDate: fromISO, toDate: toISO },
      parentId.trim() || undefined
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
        title="P&L by Agent"
        breadcrumbs={["Reports", "P&L by Agent"]}
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
          placeholder="Parent ID (optional)"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="max-w-[180px]"
        />
        <Button variant="primary">Apply</Button>
      </FilterBar>
      <Card>
        <Table>
          <TableHeader>
            <TableHead>Date</TableHead>
            <TableHead>Agent / User</TableHead>
            <TableHead align="right">Stake</TableHead>
            <TableHead align="right">P&L</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={4} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={4} message="No P&L by agent data yet." />
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{formatDateTime(row.date ?? row.createdAt)}</TableCell>
                  <TableCell>{String(row.agentName ?? row.username ?? row.userId ?? "—")}</TableCell>
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
