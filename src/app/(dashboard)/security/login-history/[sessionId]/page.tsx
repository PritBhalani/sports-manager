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
  { id: "1", field: "IP", value: "127.0.0.1" },
  { id: "2", field: "Device", value: "Chrome" },
  { id: "3", field: "Status", value: "Success" },
  { id: "4", field: "Timestamp", value: "2024-01-10T09:00:00Z" },
];

const columns = [
  { id: "field", header: "Field", sortable: false, cell: (row: Row) => String(row.field ?? "—") },
  { id: "value", header: "Value", sortable: false, cell: (row: Row) => String(row.value ?? "—") },
];

export default function LoginSessionDetailPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Login Session Detail"
        breadcrumbs={["Token / Login History", "Login History", "Detail"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Status" value="—" />
        <StatsCard title="IP" value="—" />
        <StatsCard title="Device" value="—" />
        <StatsCard title="Timestamp" value="—" />
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
              searchPlaceholder="Search session fields…"
              getSearchText={(row: Row) =>
                `${row.field ?? ""} ${row.value ?? ""}`.toLowerCase()
              }
              emptyMessage="No session detail."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

