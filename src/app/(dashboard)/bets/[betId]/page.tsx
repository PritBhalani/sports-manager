"use client";

import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Button,
  StatsCard,
  DataGrid,
} from "@/components";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", field: "Event", value: "Match 1" },
  { id: "2", field: "Market", value: "Winner" },
  { id: "3", field: "Selection", value: "Team A" },
  { id: "4", field: "Stake", value: 100 },
  { id: "5", field: "Odds", value: 1.8 },
  { id: "6", field: "Status", value: "Settled" },
];

const columns = [
  { id: "field", header: "Field", sortable: false, cell: (row: Row) => String(row.field ?? "—") },
  { id: "value", header: "Value", sortable: false, cell: (row: Row) => String(row.value ?? "—") },
];

export default function BetDetailPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Bet Detail"
        breadcrumbs={["Bet", "Detail"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Stake" value="0" />
        <StatsCard title="Odds" value="—" />
        <StatsCard title="Potential Payout" value="0" />
        <StatsCard title="Status" value="—" />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input placeholder="Search fields" className="max-w-xs" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataGrid
              enableSearch={false}
              columns={columns}
              rows={rows}
              initialSortColumnId="field"
              initialSortDirection="asc"
              searchPlaceholder="Search bet fields…"
              getSearchText={(row: Row) =>
                `${row.field ?? ""} ${row.value ?? ""}`.toLowerCase()
              }
              emptyMessage="No bet detail."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

