"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid } from "@/components";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", event: "Match 1", market: "Winner", exposure: -250 },
  { id: "2", event: "Match 2", market: "Over/Under", exposure: 100 },
];

const columns = [
  { id: "event", header: "Event", sortable: true, cell: (row: Row) => String(row.event ?? "—") },
  { id: "market", header: "Market", sortable: true, cell: (row: Row) => String(row.market ?? "—") },
  { id: "exposure", header: "Exposure", sortable: true, cell: (row: Row) => String(row.exposure ?? "0") },
];

export default function PlayerExposurePage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Player Exposure"
        breadcrumbs={["User", "Player", "Exposure"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Exposure" value="0" />
        <StatsCard title="Max Exposure" value="0" />
        <StatsCard title="Markets Exposed" value="0" />
        <StatsCard title="Events Exposed" value="0" />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input placeholder="Filter by event" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataGrid
          columns={columns}
          rows={rows}
          initialSortColumnId="event"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search exposure…"
          getSearchText={(row: Row) =>
            `${row.event ?? ""} ${row.market ?? ""}`.toLowerCase()
          }
          emptyMessage="No exposure."
        />
      </Card>
    </div>
  );
}

