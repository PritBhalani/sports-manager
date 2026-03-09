"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid } from "@/components";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", user: "player001", stake: 1000, pnl: 200 },
  { id: "2", user: "player002", stake: 500, pnl: -50 },
];

const columns = [
  { id: "user", header: "User", sortable: true, cell: (row: Row) => String(row.user ?? "—") },
  { id: "stake", header: "Stake", sortable: true, cell: (row: Row) => String(row.stake ?? "0") },
  { id: "pnl", header: "P&L", sortable: true, cell: (row: Row) => String(row.pnl ?? "0") },
];

export default function PlByMarketDetailPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="P&L by Market Detail"
        breadcrumbs={["Bet History", "P&L by Market", "Detail"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total P&L" value="0" />
        <StatsCard title="Total Stake" value="0" />
        <StatsCard title="Winning Users" value="0" />
        <StatsCard title="Losing Users" value="0" />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input placeholder="Filter by user" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataGrid
          columns={columns}
          rows={rows}
          initialSortColumnId="user"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search users…"
          getSearchText={(row: Row) =>
            `${row.user ?? ""}`.toLowerCase()
          }
          emptyMessage="No P&L data for this market."
        />
      </Card>
    </div>
  );
}

