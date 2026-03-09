"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid } from "@/components";

type Row = Record<string, unknown>;

const activityRows: Row[] = [
  { id: "1", type: "Login", detail: "Web", createdAt: "2024-01-10T09:00:00Z" },
  { id: "2", type: "Bet", detail: "Match #123", createdAt: "2024-01-10T09:05:00Z" },
];

const columns = [
  {
    id: "type",
    header: "Type",
    sortable: true,
    cell: (row: Row) => String(row.type ?? "—"),
  },
  {
    id: "detail",
    header: "Detail",
    sortable: true,
    cell: (row: Row) => String(row.detail ?? "—"),
  },
  {
    id: "createdAt",
    header: "Created At",
    sortable: true,
    cell: (row: Row) => String(row.createdAt ?? "—"),
  },
];

export default function PlayerDetailPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Player Summary"
        breadcrumbs={["User", "Player", "Summary"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Current Balance" value="0" />
        <StatsCard title="Total Bets" value="0" />
        <StatsCard title="Net P&L" value="0" />
        <StatsCard title="Last Active" value="—" />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Input placeholder="Filter by type or detail" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataGrid
          columns={columns}
          rows={activityRows}
          initialSortColumnId="createdAt"
          initialSortDirection="desc"
          enableSearch
          searchPlaceholder="Search activity…"
          getSearchText={(row: Row) =>
            `${row.type ?? ""} ${row.detail ?? ""}`.toLowerCase()
          }
          emptyMessage="No recent activity."
        />
      </Card>
    </div>
  );
}

