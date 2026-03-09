"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable, Badge } from "@/components";
import { mockPlayers, MockPlayer } from "@/mocks/players.mock";
import { formatCurrency } from "@/utils/formatCurrency";

type Row = MockPlayer;

const columns = [
  { id: "username", header: "Username", sortable: true, cell: (row: Row) => row.username },
  { id: "type", header: "Type", sortable: true, cell: (row: Row) => row.type },
  {
    id: "status",
    header: "Status",
    sortable: true,
    cell: (row: Row) => (
      <Badge
        variant={row.status === "Active" ? "success" : row.status === "Suspended" ? "warning" : "default"}
      >
        {row.status}
      </Badge>
    ),
  },
  {
    id: "balance",
    header: "Balance",
    sortable: true,
    cell: (row: Row) => `₹ ${formatCurrency(row.balance)}`,
    sortValue: (row: Row) => row.balance,
  },
];

export default function DashboardUsersPage() {
  const rows = mockPlayers;
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Dashboard Users"
        breadcrumbs={["Dashboard", "Users"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Users" value={rows.length.toString()} />
        <StatsCard
          title="Active Users"
          value={rows.filter((p) => p.status === "Active").length.toString()}
        />
        <StatsCard title="Agents" value={rows.filter((p) => p.type === "Agent").length.toString()} />
        <StatsCard title="Players" value={rows.filter((p) => p.type === "Player").length.toString()} />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input placeholder="Search username" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          initialSortColumnId="username"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search users…"
          getSearchText={(row: Row) =>
            `${row.username ?? ""} ${row.type ?? ""} ${row.status ?? ""}`.toLowerCase()
          }
          emptyMessage="No users."
        />
      </Card>
    </div>
  );
}

