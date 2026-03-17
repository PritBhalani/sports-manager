"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable, Badge } from "@/components";
import { formatCurrency } from "@/utils/formatCurrency";
import { getLiveBets } from "@/services/bet.service";

type Row = Record<string, unknown>;

export default function BetsAnalyticsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getLiveBets({ page: 1, pageSize: 100, orderByDesc: true }, {})
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setRows([]));
  }, []);

  const columns = [
    { id: "sport", header: "Sport", sortable: true, cell: (row: Row) => String(row.sport ?? row.eventType ?? "—") },
    { id: "market", header: "Market", sortable: true, cell: (row: Row) => String(row.market ?? row.marketName ?? "—") },
    {
      id: "stake",
      header: "Stake",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.stake ?? row.amount)}`,
      sortValue: (row: Row) => Number(row.stake ?? row.amount ?? 0),
    },
    {
      id: "potentialPayout",
      header: "Potential Payout",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.potentialPayout ?? row.payout)}`,
      sortValue: (row: Row) => Number(row.potentialPayout ?? row.payout ?? 0),
    },
    {
      id: "result",
      header: "Result",
      sortable: true,
      cell: (row: Row) => (
        <Badge
          variant={
            row.result === "Won"
              ? "success"
              : row.result === "Lost"
              ? "error"
              : row.result === "Pending"
              ? "warning"
              : "default"
          }
        >
          {String(row.result ?? row.status ?? "Unknown")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: Row) => {
        const id = String(row.id ?? row.marketId ?? "");
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/reports/pl-by-market/${id}`)}
            >
              View P&L
            </Button>
          </div>
        );
      },
    },
  ];
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Bets Analytics"
        breadcrumbs={["Bet", "Analytics"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Bets (Today)" value={rows.length.toString()} />
        <StatsCard title="Total Volume (Today)" value={`₹ ${formatCurrency(rows.reduce((sum, row) => sum + Number(row.stake ?? row.amount ?? 0), 0))}`} />
        <StatsCard title="Average Stake" value={`₹ ${formatCurrency(rows.length ? rows.reduce((sum, row) => sum + Number(row.stake ?? row.amount ?? 0), 0) / rows.length : 0)}`} />
        <StatsCard title="Open / Pending" value={rows.filter((row) => String(row.result ?? row.status ?? "").toLowerCase() === "pending").length.toString()} />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Input placeholder="Filter by sport" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          initialSortColumnId="sport"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search by sport…"
          getSearchText={(row: Row) =>
            `${row.sport ?? ""} ${row.market ?? row.marketName ?? ""}`.toLowerCase()
          }
          emptyMessage="No bet analytics data."
        />
      </Card>
    </div>
  );
}

