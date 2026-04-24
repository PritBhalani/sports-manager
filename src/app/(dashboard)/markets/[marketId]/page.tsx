"use client";

import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Button,
  StatsCard,
  DataTable,
} from "@/components";

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

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input placeholder="Search fields" className="max-w-xs" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataTable
              enableSearch={false}
              columns={columns}
              rows={rows}
              initialSortColumnId="field"
              initialSortDirection="asc"
              searchPlaceholder="Search market fields…"
              getSearchText={(row: Row) =>
                `${row.field ?? ""} ${row.value ?? ""}`.toLowerCase()
              }
              emptyMessage="No market detail."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

