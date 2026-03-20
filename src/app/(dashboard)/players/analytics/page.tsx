"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable, Badge } from "@/components";
import { getDownline } from "@/services/account.service";
import { getSessionMemberId } from "@/services/user.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";

type Row = Record<string, unknown>;

export default function PlayersAnalyticsPage() {
  const router = useRouter();
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

  const columns = [
    {
      id: "username",
      header: "Username",
      sortable: true,
      cell: (row: Row) => String(row.username ?? row.userId ?? "—"),
    },
    {
      id: "userCode",
      header: "User Code",
      sortable: true,
      cell: (row: Row) => String(row.userCode ?? "—"),
    },
    {
      id: "type",
      header: "Type",
      sortable: true,
      cell: (row: Row) => String(row.type ?? row.userType ?? "—"),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (row: Row) => {
        const status = String(row.status ?? "Unknown");
        return (
          <Badge
            variant={status.toLowerCase() === "active" ? "success" : status.toLowerCase() === "suspended" ? "warning" : "default"}
          >
            {status}
          </Badge>
        );
      },
    },
    {
      id: "balance",
      header: "Balance",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.balance ?? row.chips ?? row.cash)}`,
      sortValue: (row: Row) => Number(row.balance ?? row.chips ?? row.cash ?? 0),
    },
    {
      id: "exposure",
      header: "Exposure",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.exposure)}`,
      sortValue: (row: Row) => Number(row.exposure ?? 0),
    },
    {
      id: "createdAt",
      header: "Created",
      sortable: true,
      cell: (row: Row) => formatDateTime(row.createdAt ?? row.date ?? row.timestamp),
      sortValue: (row: Row) => Date.parse(String(row.createdAt ?? row.date ?? row.timestamp ?? 0)),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: Row) => {
        const id = String(row.id ?? row.userId ?? "");
        if (!id) return null;
        return (
          <div className="flex flex-wrap gap-1">
            <Button variant="outline" size="sm" onClick={() => router.push(`/players/${id}`)}>
              Details
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/players/${id}/bets`)}>
              Bets
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/players/${id}/activity`)}>
              Activity
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/players/${id}/balance`)}>
              Balance
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/players/${id}/exposure`)}>
              Exposure
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Players Analytics"
        breadcrumbs={["User", "Analytics"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Players" value={rows.length.toString()} />
        <StatsCard
          title="Active Players"
          value={rows.filter((p) => String(p.status ?? "").toLowerCase() === "active").length.toString()}
        />
        <StatsCard
          title="Suspended"
          value={rows.filter((p) => String(p.status ?? "").toLowerCase() === "suspended").length.toString()}
        />
        <StatsCard
          title="Masters / Agents"
          value={rows.filter((p) => String(p.type ?? p.userType ?? "").toLowerCase() !== "player").length.toString()}
        />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Input placeholder="Search username or code" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          initialSortColumnId="username"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search players…"
          getSearchText={(row: Row) =>
            `${row.username ?? ""} ${row.userCode ?? ""} ${row.type ?? row.userType ?? ""} ${row.status ?? ""}`.toLowerCase()
          }
          emptyMessage="No players found."
        />
      </Card>
    </div>
  );
}

