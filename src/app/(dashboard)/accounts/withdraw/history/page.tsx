"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable } from "@/components";
import { getAccountStatement } from "@/services/account.service";
import { CURRENT_USER_ID } from "@/utils/constants";
import { formatCurrency } from "@/utils/formatCurrency";
import { dateRangeToISO, formatDateTime, todayRangeUTC } from "@/utils/date";

type Row = Record<string, unknown>;

const getAmount = (row: Row) =>
  Number(row.amount ?? row.debit ?? row.chips ?? 0);

const isWithdrawRow = (row: Row) => {
  const label = String(
    row.type ?? row.dwType ?? row.description ?? row.comment ?? "",
  ).toLowerCase();
  return (
    label.includes("withdraw") ||
    label.includes("transferout") ||
    label.includes("transfer out") ||
    label === "w"
  );
};

const columns = [
  {
    id: "createdAt",
    header: "Date / Time",
    sortable: true,
    cell: (row: Row) => formatDateTime(row.createdAt ?? row.date ?? row.timestamp),
    sortValue: (row: Row) => Date.parse(String(row.createdAt ?? row.date ?? row.timestamp ?? 0)),
  },
  {
    id: "username",
    header: "User",
    sortable: true,
    cell: (row: Row) => String(row.username ?? row.userCode ?? row.userId ?? "—"),
  },
  {
    id: "amount",
    header: "Amount",
    sortable: true,
    cell: (row: Row) => `₹ ${formatCurrency(getAmount(row))}`,
    sortValue: (row: Row) => getAmount(row),
  },
  {
    id: "channel",
    header: "Channel",
    sortable: true,
    cell: (row: Row) => String(row.channel ?? row.mode ?? row.source ?? "—"),
  },
];

export default function WithdrawHistoryPage() {
  const [statementRows, setStatementRows] = useState<Row[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
    getAccountStatement(
      { page: 1, pageSize: 100, orderByDesc: true },
      { fromDate: fromISO, toDate: toISO },
      CURRENT_USER_ID,
    )
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setStatementRows(list);
      })
      .catch(() => setStatementRows([]));
  }, [fromDate, toDate]);

  const rows = useMemo(() => statementRows.filter(isWithdrawRow), [statementRows]);
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Withdraw History"
        breadcrumbs={["Account", "Withdraw", "History"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Withdrawals" value={rows.length.toString()} />
        <StatsCard
          title="Total Amount"
          value={`₹ ${formatCurrency(rows.reduce((sum, t) => sum + getAmount(t), 0))}`}
        />
        <StatsCard
          title="Average Withdrawal"
          value={`₹ ${formatCurrency(
            rows.length ? rows.reduce((sum, t) => sum + getAmount(t), 0) / rows.length : 0,
          )}`}
        />
        <StatsCard
          title="Unique Users"
          value={new Set(rows.map((t) => String(t.username ?? t.userCode ?? t.userId ?? ""))).size.toString()}
        />
      </div>

      <Card>
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
          <Input placeholder="Filter by user or method" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          initialSortColumnId="createdAt"
          initialSortDirection="desc"
          enableSearch
          searchPlaceholder="Search withdrawals…"
          getSearchText={(row: Row) =>
            `${row.username ?? ""} ${row.userCode ?? ""} ${row.referenceId ?? ""} ${row.channel ?? ""}`.toLowerCase()
          }
          emptyMessage="No withdrawals."
        />
      </Card>
    </div>
  );
}

