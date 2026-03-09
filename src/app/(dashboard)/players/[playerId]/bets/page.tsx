"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid } from "@/components";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", event: "Match 1", market: "Winner", selection: "Team A", stake: 100, odds: 1.8, status: "Settled" },
  { id: "2", event: "Match 2", market: "Over/Under", selection: "Over 2.5", stake: 50, odds: 2.1, status: "Open" },
];

const columns = [
  { id: "event", header: "Event", sortable: true, cell: (row: Row) => String(row.event ?? "—") },
  { id: "market", header: "Market", sortable: true, cell: (row: Row) => String(row.market ?? "—") },
  { id: "selection", header: "Selection", sortable: true, cell: (row: Row) => String(row.selection ?? "—") },
  { id: "stake", header: "Stake", sortable: true, cell: (row: Row) => String(row.stake ?? "0") },
  { id: "odds", header: "Odds", sortable: true, cell: (row: Row) => String(row.odds ?? "—") },
  { id: "status", header: "Status", sortable: true, cell: (row: Row) => String(row.status ?? "—") },
];

export default function PlayerBetsPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Player Bets"
        breadcrumbs={["User", "Player", "Bets"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Bets" value="0" />
        <StatsCard title="Settled Bets" value="0" />
        <StatsCard title="Open Bets" value="0" />
        <StatsCard title="Net P&L" value="0" />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Input placeholder="Filter by event or selection" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataGrid
          columns={columns}
          rows={rows}
          initialSortColumnId="event"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search bets…"
          getSearchText={(row: Row) =>
            `${row.event ?? ""} ${row.market ?? ""} ${row.selection ?? ""}`.toLowerCase()
          }
          emptyMessage="No bets for this player."
        />
      </Card>
    </div>
  );
}

