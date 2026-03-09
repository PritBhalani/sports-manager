"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid, Tabs } from "@/components";

type Row = Record<string, unknown>;

const loginRows: Row[] = [
  { id: "1", type: "Login", device: "Chrome", ip: "127.0.0.1", createdAt: "2024-01-10T09:00:00Z" },
];

const inoutRows: Row[] = [
  { id: "1", type: "Deposit", amount: 1000, balance: 1500, createdAt: "2024-01-09T12:00:00Z" },
];

const loginColumns = [
  { id: "createdAt", header: "Date / Time", sortable: true, cell: (row: Row) => String(row.createdAt ?? "—") },
  { id: "type", header: "Type", sortable: true, cell: (row: Row) => String(row.type ?? "—") },
  { id: "device", header: "Device", sortable: true, cell: (row: Row) => String(row.device ?? "—") },
  { id: "ip", header: "IP", sortable: true, cell: (row: Row) => String(row.ip ?? "—") },
];

const inoutColumns = [
  { id: "createdAt", header: "Date / Time", sortable: true, cell: (row: Row) => String(row.createdAt ?? "—") },
  { id: "type", header: "Type", sortable: true, cell: (row: Row) => String(row.type ?? "—") },
  { id: "amount", header: "Amount", sortable: true, cell: (row: Row) => String(row.amount ?? "0") },
  { id: "balance", header: "Balance", sortable: true, cell: (row: Row) => String(row.balance ?? "0") },
];

export default function PlayerActivityPage() {
  const tabs = [
    {
      id: "logins",
      label: "Logins",
      content: (
        <Card>
          <FilterBar className="mb-4">
            <Input type="date" className="max-w-[160px]" />
            <Input type="date" className="max-w-[160px]" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <DataGrid
            columns={loginColumns}
            rows={loginRows}
            initialSortColumnId="createdAt"
            initialSortDirection="desc"
            enableSearch
            searchPlaceholder="Search logins…"
            getSearchText={(row: Row) =>
              `${row.type ?? ""} ${row.device ?? ""} ${row.ip ?? ""}`.toLowerCase()
            }
            emptyMessage="No login activity."
          />
        </Card>
      ),
    },
    {
      id: "inout",
      label: "In/Out",
      content: (
        <Card>
          <FilterBar className="mb-4">
            <Input type="date" className="max-w-[160px]" />
            <Input type="date" className="max-w-[160px]" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <DataGrid
            columns={inoutColumns}
            rows={inoutRows}
            initialSortColumnId="createdAt"
            initialSortDirection="desc"
            enableSearch
            searchPlaceholder="Search in/out…"
            getSearchText={(row: Row) =>
              `${row.type ?? ""} ${row.amount ?? ""}`.toLowerCase()
            }
            emptyMessage="No in/out activity."
          />
        </Card>
      ),
    },
  ];

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Player Activity"
        breadcrumbs={["User", "Player", "Activity"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Logins (30d)" value="0" />
        <StatsCard title="Total Deposits" value="0" />
        <StatsCard title="Total Withdrawals" value="0" />
        <StatsCard title="Net In/Out" value="0" />
      </div>

      <Tabs
        activeId={tabs[0].id}
        onTabChange={() => {}}
        tabs={tabs}
      />
    </div>
  );
}

