"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid } from "@/components";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", field: "Sport", value: "Cricket" },
  { id: "2", field: "Market", value: "Match Odds" },
  { id: "3", field: "Status", value: "Open" },
  { id: "4", field: "Locked", value: "No" },
];

const columns = [
  { id: "field", header: "Field", sortable: false, cell: (row: Row) => String(row.field ?? "—") },
  { id: "value", header: "Value", sortable: false, cell: (row: Row) => String(row.value ?? "—") },
];

export default function MarketDetailPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Market Detail"
        breadcrumbs={["Manage Market", "Market", "Detail"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Status" value="—" />
        <StatsCard title="Locked" value="—" />
        <StatsCard title="Total Bets" value="0" />
        <StatsCard title="Total Volume" value="0" />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input placeholder="Search fields" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataGrid
          columns={columns}
          rows={rows}
          initialSortColumnId="field"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search market fields…"
          getSearchText={(row: Row) =>
            `${row.field ?? ""} ${row.value ?? ""}`.toLowerCase()
          }
          emptyMessage="No market detail."
        />
      </Card>
    </div>
  );
}

