"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable } from "@/components";
import { mockMarkets, MockMarket } from "@/mocks/markets.mock";

type Row = MockMarket;

const columns = [
  { id: "sport", header: "Sport", sortable: true, cell: (row: Row) => row.sport },
  { id: "eventName", header: "Event", sortable: true, cell: (row: Row) => row.eventName },
  { id: "marketName", header: "Market", sortable: true, cell: (row: Row) => row.marketName },
  { id: "status", header: "Status", sortable: true, cell: (row: Row) => row.status },
];

export default function DashboardMarketsPage() {
  const rows = mockMarkets;
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Dashboard Markets"
        breadcrumbs={["Dashboard", "Markets"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Markets" value={rows.length.toString()} />
        <StatsCard
          title="In-Play Markets"
          value={rows.filter((m) => m.status === "In-Play").length.toString()}
        />
        <StatsCard
          title="Locked / Suspended"
          value={rows.filter((m) => m.status === "Suspended").length.toString()}
        />
        <StatsCard
          title="Sports Covered"
          value={Array.from(new Set(rows.map((m) => m.sport))).length.toString()}
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
          initialSortColumnId="sport"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search sports…"
          getSearchText={(row: Row) =>
            `${row.sport ?? ""}`.toLowerCase()
          }
          emptyMessage="No markets."
        />
      </Card>
    </div>
  );
}

