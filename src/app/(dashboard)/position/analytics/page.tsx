"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid } from "@/components";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", sport: "Cricket", exposure: -5000, markets: 10 },
  { id: "2", sport: "Football", exposure: -2000, markets: 6 },
];

const columns = [
  { id: "sport", header: "Sport", sortable: true, cell: (row: Row) => String(row.sport ?? "—") },
  { id: "exposure", header: "Exposure", sortable: true, cell: (row: Row) => String(row.exposure ?? "0") },
  { id: "markets", header: "Markets", sortable: true, cell: (row: Row) => String(row.markets ?? "0") },
];

export default function PositionAnalyticsPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Position Analytics"
        breadcrumbs={["Position", "Analytics"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Exposure" value="0" />
        <StatsCard title="Most Exposed Sport" value="—" />
        <StatsCard title="Markets Exposed" value="0" />
        <StatsCard title="Events Exposed" value="0" />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input placeholder="Filter by sport" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataGrid
          columns={columns}
          rows={rows}
          initialSortColumnId="sport"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search sports…"
          getSearchText={(row: Row) =>
            `${row.sport ?? ""}`.toLowerCase()
          }
          emptyMessage="No position analytics data."
        />
      </Card>
    </div>
  );
}

