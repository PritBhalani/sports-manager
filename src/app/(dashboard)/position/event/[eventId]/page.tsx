"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid } from "@/components";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", market: "Match Odds", exposure: -1000 },
  { id: "2", market: "Over/Under", exposure: -500 },
];

const columns = [
  { id: "market", header: "Market", sortable: true, cell: (row: Row) => String(row.market ?? "—") },
  { id: "exposure", header: "Exposure", sortable: true, cell: (row: Row) => String(row.exposure ?? "0") },
];

export default function EventPositionDetailPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Event Position Detail"
        breadcrumbs={["Position", "Event", "Detail"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Exposure" value="0" />
        <StatsCard title="Markets" value="0" />
        <StatsCard title="Most Exposed Market" value="—" />
        <StatsCard title="Net P&L" value="0" />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input placeholder="Filter by market" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataGrid
          columns={columns}
          rows={rows}
          initialSortColumnId="market"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search markets…"
          getSearchText={(row: Row) =>
            `${row.market ?? ""}`.toLowerCase()
          }
          emptyMessage="No position data for this event."
        />
      </Card>
    </div>
  );
}

