"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable } from "@/components";
import { getAccountStatement } from "@/services/account.service";
import { getSessionMemberId } from "@/services/user.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { dateRangeToISO, formatDateTime, todayRangeUTC } from "@/utils/date";

type Row = Record<string, unknown>;

const getAmount = (row: Row) =>
  Number(row.amount ?? row.credit ?? row.debit ?? row.chips ?? 0);

const columns = [
  {
    id: "createdAt",
    header: "Date / Time",
    sortable: true,
    cell: (row: Row) => formatDateTime(row.createdAt ?? row.date ?? row.timestamp),
    sortValue: (row: Row) => Date.parse(String(row.createdAt ?? row.date ?? row.timestamp ?? 0)),
  },
  {
    id: "type",
    header: "Type",
    sortable: true,
    cell: (row: Row) => String(row.type ?? row.dwType ?? row.description ?? "—"),
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
    id: "balanceAfter",
    header: "Balance After",
    sortable: true,
    cell: (row: Row) => `₹ ${formatCurrency(row.balance ?? row.balanceAfter)}`,
    sortValue: (row: Row) => Number(row.balance ?? row.balanceAfter ?? 0),
  },
];

export default function AccountsHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
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
    if (!userId) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
    getAccountStatement(
      { page: 1, pageSize: 100, orderByDesc: true },
      { fromDate: fromISO, toDate: toISO },
      userId,
    )
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setRows([]));
  }, [fromDate, toDate]);
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Account History"
        breadcrumbs={["Account", "History"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Entries" value={rows.length.toString()} />
        <StatsCard
          title="Total In"
          value={`₹ ${formatCurrency(
            rows
              .filter((t) => {
                const label = String(t.type ?? t.dwType ?? "").toLowerCase();
                return label === "deposit" || label === "transferin" || label === "transfer in" || label === "d";
              })
              .reduce((sum, t) => sum + getAmount(t), 0),
          )}`}
        />
        <StatsCard
          title="Total Out"
          value={`₹ ${formatCurrency(
            rows
              .filter((t) => {
                const label = String(t.type ?? t.dwType ?? "").toLowerCase();
                return label === "withdraw" || label === "transferout" || label === "transfer out" || label === "w";
              })
              .reduce((sum, t) => sum + getAmount(t), 0),
          )}`}
        />
        <StatsCard
          title="Net In/Out"
          value={`₹ ${formatCurrency(
            rows.reduce(
              (sum, t) =>
                sum +
                (["deposit", "transferin", "transfer in", "d"].includes(
                  String(t.type ?? t.dwType ?? "").toLowerCase(),
                )
                  ? getAmount(t)
                  : -getAmount(t)),
              0,
            ),
          )}`}
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
          <Input placeholder="Filter by user or type" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          initialSortColumnId="createdAt"
          initialSortDirection="desc"
          enableSearch
          searchPlaceholder="Search account history…"
          getSearchText={(row: Row) =>
            `${row.type ?? ""} ${row.username ?? ""} ${row.userCode ?? ""} ${row.referenceId ?? ""}`.toLowerCase()
          }
          emptyMessage="No account history."
        />
      </Card>
    </div>
  );
}

