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
  { id: "1", field: "User", value: "player001" },
  { id: "2", field: "Amount", value: 500 },
  { id: "3", field: "Type", value: "Transfer Out" },
  { id: "4", field: "Timestamp", value: "2024-01-09T10:00:00Z" },
];

const columns = [
  { id: "field", header: "Field", sortable: false, cell: (row: Row) => String(row.field ?? "—") },
  { id: "value", header: "Value", sortable: false, cell: (row: Row) => String(row.value ?? "—") },
];

export default function TransferDetailPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Transfer Detail"
        breadcrumbs={["Account", "Transfer", "Detail"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Amount" value="0" />
        <StatsCard title="Type" value="—" />
        <StatsCard title="User" value="—" />
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
              searchPlaceholder="Search transfer fields…"
              getSearchText={(row: Row) =>
                `${row.field ?? ""} ${row.value ?? ""}`.toLowerCase()
              }
              emptyMessage="No transfer detail."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

