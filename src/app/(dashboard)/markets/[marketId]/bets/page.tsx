"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid } from "@/components";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", user: "player001", selection: "Team A", stake: 100, odds: 1.8, pnl: 20 },
  { id: "2", user: "player002", selection: "Team B", stake: 50, odds: 2.2, pnl: -50 },
];

const columns = [
  { id: "user", header: "User", sortable: true, cell: (row: Row) => String(row.user ?? "—") },
  { id: "selection", header: "Selection", sortable: true, cell: (row: Row) => String(row.selection ?? "—") },
  { id: "stake", header: "Stake", sortable: true, cell: (row: Row) => String(row.stake ?? "0") },
  { id: "odds", header: "Odds", sortable: true, cell: (row: Row) => String(row.odds ?? "—") },
  { id: "pnl", header: "P&L", sortable: true, cell: (row: Row) => String(row.pnl ?? "0") },
];

export default function MarketBetsPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Market Bets"
        breadcrumbs={["Manage Market", "Market", "Bets"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Bets" value="0" />
        <StatsCard title="Total Volume" value="0" />
        <StatsCard title="Average Stake" value="0" />
        <StatsCard title="Net P&L" value="0" />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input placeholder="Filter by user or selection" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataGrid
          columns={columns}
          rows={rows}
          initialSortColumnId="user"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search bets…"
          getSearchText={(row: Row) =>
            `${row.user ?? ""} ${row.selection ?? ""}`.toLowerCase()
          }
          emptyMessage="No bets for this market."
        />
      </Card>
    </div>
  );
}

