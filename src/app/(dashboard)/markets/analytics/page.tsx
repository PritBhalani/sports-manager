"use client";

import { useRouter } from "next/navigation";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable, Badge } from "@/components";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";
import { mockMarkets, MockMarket } from "@/mocks/markets.mock";

type Row = MockMarket;

export default function MarketsAnalyticsPage() {
  const router = useRouter();

  const columns = [
    { id: "sport", header: "Sport", sortable: true, cell: (row: Row) => row.sport },
    { id: "eventName", header: "Event", sortable: true, cell: (row: Row) => row.eventName },
    { id: "marketName", header: "Market", sortable: true, cell: (row: Row) => row.marketName },
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
          {row.status}
        </Badge>
      ),
    },
    {
      id: "totalMatched",
      header: "Matched",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.totalMatched)}`,
      sortValue: (row: Row) => row.totalMatched,
    },
    {
      id: "totalBets",
      header: "Bets",
      sortable: true,
      cell: (row: Row) => row.totalBets.toString(),
      sortValue: (row: Row) => row.totalBets,
    },
    {
      id: "startTime",
      header: "Start Time",
      sortable: true,
      cell: (row: Row) => formatDateTime(row.startTime),
      sortValue: (row: Row) => Date.parse(row.startTime),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: Row) => {
        const id = row.id;
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
        <StatsCard title="Total Markets" value={mockMarkets.length.toString()} />
        <StatsCard
          title="In-Play Markets"
          value={mockMarkets.filter((m) => m.status === "In-Play").length.toString()}
        />
        <StatsCard
          title="Locked / Suspended"
          value={mockMarkets.filter((m) => m.status === "Suspended").length.toString()}
        />
        <StatsCard
          title="Sports Covered"
          value={Array.from(new Set(mockMarkets.map((m) => m.sport))).length.toString()}
        />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input placeholder="Filter by sport" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={mockMarkets}
          initialSortColumnId="startTime"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search sports…"
          getSearchText={(row: Row) =>
            `${row.sport ?? ""}`.toLowerCase()
          }
          emptyMessage="No market analytics data."
        />
      </Card>
    </div>
  );
}

