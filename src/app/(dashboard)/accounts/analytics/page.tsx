"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Button,
  StatsCard,
  DataTable,
  Badge,
} from "@/components";
import { getAccountStatement } from "@/services/account.service";
import { getSessionMemberId } from "@/services/user.service";
import { dateRangeToISO, todayRangeUTC } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { downloadCsv } from "@/utils/csvDownload";

type Row = Record<string, unknown>;

const getAmount = (row: Row) => Number(row.amount ?? row.credit ?? row.debit ?? row.chips ?? 0);

export default function AccountsAnalyticsPage() {
  const router = useRouter();
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

  const columns = [
    {
      id: "username",
      header: "User",
      sortable: true,
      cell: (row: Row) => String(row.username ?? row.userId ?? "—"),
    },
    {
      id: "userCode",
      header: "User Code",
      sortable: true,
      cell: (row: Row) => String(row.userCode ?? "—"),
    },
    {
      id: "type",
      header: "Type",
      sortable: true,
      cell: (row: Row) => String(row.type ?? row.dwType ?? row.description ?? "—").replace("Transfer", "Transfer "),
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
      id: "balanceAfter",
      header: "Balance After",
      sortable: true,
      cell: (row: Row) => {
        const n = Number(row.balance ?? row.balanceAfter ?? 0);
        return (
          <span className={`tabular-nums ${signedAmountTextClass(n)}`}>
            ₹ {formatCurrency(row.balance ?? row.balanceAfter)}
          </span>
        );
      },
      sortValue: (row: Row) => Number(row.balance ?? row.balanceAfter ?? 0),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (row: Row) => {
        const status = String(row.status ?? "Unknown");
        return (
          <Badge
            variant={
              status === "Completed"
                ? "success"
                : status === "Pending"
                  ? "warning"
                  : "error"
            }
          >
            {status}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: Row) => {
        const id = String(row.userId ?? "");
        if (!id) return null;
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/players/${id}`)}
            >
              View Player
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/players/${id}`)}
            >
              View Player
            </Button>
          </div>
        );
      },
    },
  ];

  const exportAccountAnalyticsCsv = useCallback(() => {
    downloadCsv(
      `account-analytics-${fromDate}-${toDate}.csv`,
      ["User", "User code", "Type", "Amount", "Balance after", "Status", "User ID"],
      rows.map((row) => [
        String(row.username ?? row.userId ?? ""),
        String(row.userCode ?? ""),
        String(row.type ?? row.dwType ?? row.description ?? ""),
        getAmount(row),
        Number(row.balance ?? row.balanceAfter ?? 0),
        String(row.status ?? ""),
        String(row.userId ?? ""),
      ]),
    );
  }, [rows, fromDate, toDate]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Account Analytics"
        breadcrumbs={["Account", "Analytics"]}
        action={
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={exportAccountAnalyticsCsv}
            disabled={rows.length === 0}
          >
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Transactions" value={rows.length.toString()} />
        <StatsCard
          title="Total In"
          value={`₹ ${formatCurrency(
            rows
              .filter((row) => getAmount(row) >= 0)
              .reduce((sum, row) => sum + getAmount(row), 0),
          )}`}
        />
        <StatsCard
          title="Total Out"
          value={`₹ ${formatCurrency(
            rows
              .filter((row) => getAmount(row) < 0)
              .reduce((sum, row) => sum + Math.abs(getAmount(row)), 0),
          )}`}
        />
        <StatsCard
          title="Completed"
          value={rows.filter((row) => String(row.status ?? "") === "Completed").length.toString()}
        />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="max-w-[160px]" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="max-w-[160px]" />
            <Input placeholder="Search user or code" className="max-w-xs" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataTable
              enableSearch={false}
              columns={columns}
              rows={rows}
              initialSortColumnId="username"
              initialSortDirection="asc"
              searchPlaceholder="Search accounts…"
              getSearchText={(row: Row) =>
                `${row.username ?? ""} ${row.userCode ?? ""}`.toLowerCase()
              }
              emptyMessage="No account analytics data."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

