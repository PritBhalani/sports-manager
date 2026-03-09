"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid } from "@/components";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", event: "Match 1", market: "Winner", bets: 50, volume: 20000 },
  { id: "2", event: "Match 2", market: "Over/Under", bets: 30, volume: 15000 },
];

const columns = [
  { id: "event", header: "Event", sortable: true, cell: (row: Row) => String(row.event ?? "—") },
  { id: "market", header: "Market", sortable: true, cell: (row: Row) => String(row.market ?? "—") },
  { id: "bets", header: "Bets", sortable: true, cell: (row: Row) => String(row.bets ?? "0") },
  { id: "volume", header: "Volume", sortable: true, cell: (row: Row) => String(row.volume ?? "0") },
];

export default function BetsMarketsPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Bet Markets"
        breadcrumbs={["Bet", "Markets"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Markets" value="0" />
        <StatsCard title="Active Markets" value="0" />
        <StatsCard title="Total Bets" value="0" />
        <StatsCard title="Total Volume" value="0" />
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
          searchPlaceholder="Search markets…"
          getSearchText={(row: Row) =>
            `${row.event ?? ""} ${row.market ?? ""}`.toLowerCase()
          }
          emptyMessage="No markets."
        />
      </Card>
    </div>
  );
}

