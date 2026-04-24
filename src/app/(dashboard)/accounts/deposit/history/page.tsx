"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Button,
  StatsCard,
  DataTable,
} from "@/components";
import { getAccountStatement } from "@/services/account.service";
import { getSessionMemberId } from "@/services/user.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { dateRangeToISO, formatDateTime, todayRangeUTC } from "@/utils/date";
import { downloadCsv } from "@/utils/csvDownload";

type Row = Record<string, unknown>;

const getAmount = (row: Row) =>
  Number(row.amount ?? row.credit ?? row.chips ?? 0);

const isDepositRow = (row: Row) => {
  const label = String(
    row.type ?? row.dwType ?? row.description ?? row.comment ?? "",
  ).toLowerCase();
  return (
    label.includes("deposit") ||
    label.includes("transferin") ||
    label.includes("transfer in") ||
    label === "d"
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
    cell: (row: Row) => {
      const n = getAmount(row);
      return (
        <span className={`tabular-nums ${signedAmountTextClass(n)}`}>
          ₹ {formatCurrency(getAmount(row))}
        </span>
      );
    },
    sortValue: (row: Row) => getAmount(row),
  },
  {
    id: "channel",
    header: "Channel",
    sortable: true,
    cell: (row: Row) => String(row.channel ?? row.mode ?? row.source ?? "—"),
  },
];

export default function DepositHistoryPage() {
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
    const userId = getSessionMemberId();
    if (!userId) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
    getAccountStatement(
      { page: 1, pageSize: 100, orderByDesc: true },
      { fromDate: fromISO, toDate: toISO },
      userId,
    )
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setStatementRows(list);
      })
      .catch(() => setStatementRows([]));
  }, [fromDate, toDate]);

  const rows = useMemo(() => statementRows.filter(isDepositRow), [statementRows]);

  const exportDepositHistoryCsv = useCallback(() => {
    downloadCsv(
      `deposit-history-${fromDate}-${toDate}.csv`,
      ["Date / Time", "User", "Amount", "Channel"],
      rows.map((row) => [
        formatDateTime(row.createdAt ?? row.date ?? row.timestamp),
        String(row.username ?? row.userCode ?? row.userId ?? ""),
        getAmount(row),
        String(row.channel ?? row.mode ?? row.source ?? ""),
      ]),
    );
  }, [rows, fromDate, toDate]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Deposit History"
        breadcrumbs={["Account", "Deposit", "History"]}
        action={
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={exportDepositHistoryCsv}
            disabled={rows.length === 0}
          >
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Deposits" value={rows.length.toString()} />
        <StatsCard
          title="Total Amount"
          value={`₹ ${formatCurrency(rows.reduce((sum, t) => sum + getAmount(t), 0))}`}
        />
        <StatsCard
          title="Average Deposit"
          value={`₹ ${formatCurrency(
            rows.length ? rows.reduce((sum, t) => sum + getAmount(t), 0) / rows.length : 0,
          )}`}
        />
        <StatsCard
          title="Unique Users"
          value={new Set(rows.map((t) => String(t.username ?? t.userCode ?? t.userId ?? ""))).size.toString()}
        />
      </div>

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
            <Input placeholder="Filter by user or method" className="max-w-xs" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataTable
              enableSearch={false}
              columns={columns}
              rows={rows}
              initialSortColumnId="createdAt"
              initialSortDirection="desc"
              searchPlaceholder="Search deposits…"
              getSearchText={(row: Row) =>
                `${row.username ?? ""} ${row.userCode ?? ""} ${row.referenceId ?? ""} ${row.channel ?? ""}`.toLowerCase()
              }
              emptyMessage="No deposits."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

