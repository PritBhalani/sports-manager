"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataGrid } from "@/components";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", type: "Deposit", amount: 500, balance: 1000, createdAt: "2024-01-09T10:00:00Z" },
  { id: "2", type: "Bet", amount: -100, balance: 900, createdAt: "2024-01-09T10:15:00Z" },
];

const columns = [
  { id: "createdAt", header: "Date / Time", sortable: true, cell: (row: Row) => String(row.createdAt ?? "—") },
  { id: "type", header: "Type", sortable: true, cell: (row: Row) => String(row.type ?? "—") },
  { id: "amount", header: "Amount", sortable: true, cell: (row: Row) => String(row.amount ?? "0") },
  { id: "balance", header: "Balance After", sortable: true, cell: (row: Row) => String(row.balance ?? "0") },
];

export default function PlayerBalancePage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Player Balance History"
        breadcrumbs={["User", "Player", "Balance"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Current Balance" value="0" />
        <StatsCard title="Total Deposits" value="0" />
        <StatsCard title="Total Withdrawals" value="0" />
        <StatsCard title="Net In/Out" value="0" />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataGrid
          columns={columns}
          rows={rows}
          initialSortColumnId="createdAt"
          initialSortDirection="desc"
          enableSearch
          searchPlaceholder="Search balance changes…"
          getSearchText={(row: Row) =>
            `${row.type ?? ""} ${row.amount ?? ""}`.toLowerCase()
          }
          emptyMessage="No balance history."
        />
      </Card>
    </div>
  );
}

