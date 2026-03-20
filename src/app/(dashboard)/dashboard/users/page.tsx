"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable, Badge } from "@/components";
import { getDownline } from "@/services/account.service";
import { getSessionMemberId } from "@/services/user.service";
import { formatCurrency } from "@/utils/formatCurrency";

type Row = Record<string, unknown>;

const columns = [
  { id: "username", header: "Username", sortable: true, cell: (row: Row) => String(row.username ?? row.userCode ?? "—") },
  { id: "type", header: "Type", sortable: true, cell: (row: Row) => String(row.type ?? row.userType ?? "—") },
  {
    id: "status",
    header: "Status",
    sortable: true,
    cell: (row: Row) => (
      <Badge
        variant={String(row.status ?? "").toLowerCase() === "active" ? "success" : String(row.status ?? "").toLowerCase() === "suspended" ? "warning" : "default"}
      >
        {String(row.status ?? "Unknown")}
      </Badge>
    ),
  },
  {
    id: "balance",
    header: "Balance",
    sortable: true,
    cell: (row: Row) => `₹ ${formatCurrency(row.balance ?? row.chips ?? row.cash)}`,
    sortValue: (row: Row) => Number(row.balance ?? row.chips ?? row.cash ?? 0),
  },
];

export default function DashboardUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const userId = getSessionMemberId();
    if (!userId) {
      setRows([]);
      return;
    }
    getDownline({ page: 1, pageSize: 100, orderByDesc: true }, {}, userId)
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setRows([]));
  }, []);
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
          value={rows.filter((p) => String(p.status ?? "").toLowerCase() === "active").length.toString()}
        />
        <StatsCard title="Agents" value={rows.filter((p) => String(p.type ?? p.userType ?? "").toLowerCase() === "agent").length.toString()} />
        <StatsCard title="Players" value={rows.filter((p) => String(p.type ?? p.userType ?? "").toLowerCase() === "player").length.toString()} />
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
            `${row.username ?? ""} ${row.type ?? row.userType ?? ""} ${row.status ?? ""}`.toLowerCase()
          }
          emptyMessage="No users."
        />
      </Card>
    </div>
  );
}

