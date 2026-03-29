"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable, Badge } from "@/components";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";
import { getPlByMarket } from "@/services/betHistory.service";

type Row = Record<string, unknown>;

export default function MarketsAnalyticsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getPlByMarket({ page: 1, pageSize: 100, orderByDesc: true }, {})
      .then((res) => setRows((res.items ?? []) as Row[]))
      .catch(() => setRows([]));
  }, []);

  const columns = [
    { id: "sport", header: "Sport", sortable: true, cell: (row: Row) => String(row.sport ?? row.eventType ?? "—") },
    { id: "eventName", header: "Event", sortable: true, cell: (row: Row) => String(row.eventName ?? row.event ?? "—") },
    { id: "marketName", header: "Market", sortable: true, cell: (row: Row) => String(row.marketName ?? row.market ?? "—") },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (row: Row) => (
        <Badge
          variant={
            row.status === "Open"
              ? "success"
              : row.status === "In-Play"
              ? "info"
              : row.status === "Suspended"
              ? "warning"
              : "default"
          }
        >
          {String(row.status ?? "Unknown")}
        </Badge>
      ),
    },
    {
      id: "totalMatched",
      header: "Matched",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.totalMatched ?? row.stake ?? row.amount)}`,
      sortValue: (row: Row) => Number(row.totalMatched ?? row.stake ?? row.amount ?? 0),
    },
    {
      id: "totalBets",
      header: "Bets",
      sortable: true,
      cell: (row: Row) => String(row.totalBets ?? row.bets ?? "0"),
      sortValue: (row: Row) => Number(row.totalBets ?? row.bets ?? 0),
    },
    {
      id: "startTime",
      header: "Start Time",
      sortable: true,
      cell: (row: Row) => formatDateTime(row.startTime ?? row.date ?? row.createdAt),
      sortValue: (row: Row) => Date.parse(String(row.startTime ?? row.date ?? row.createdAt ?? 0)),
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
              onClick={() => router.push(`/markets/${id}`)}
            >
              View Detail
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/markets/${id}/bets`)}
            >
              View Bets
            </Button>
          </div>
        );
      },
    },
  ];
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Markets Analytics"
        breadcrumbs={["Manage Market", "Analytics"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Markets" value={rows.length.toString()} />
        <StatsCard
          title="In-Play Markets"
          value={rows.filter((m) => String(m.status ?? "").toLowerCase() === "in-play").length.toString()}
        />
        <StatsCard
          title="Locked / Suspended"
          value={rows.filter((m) => String(m.status ?? "").toLowerCase() === "suspended").length.toString()}
        />
        <StatsCard
          title="Sports Covered"
          value={Array.from(new Set(rows.map((m) => String(m.sport ?? "")))).length.toString()}
        />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input placeholder="Filter by sport" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          initialSortColumnId="startTime"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search sports…"
          getSearchText={(row: Row) =>
            `${row.sport ?? ""} ${row.marketName ?? row.market ?? ""}`.toLowerCase()
          }
          emptyMessage="No market analytics data."
        />
      </Card>
    </div>
  );
}

