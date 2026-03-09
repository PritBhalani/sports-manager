"use client";

import { useRouter } from "next/navigation";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable, Badge } from "@/components";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";
import { mockPlayers, MockPlayer } from "@/mocks/players.mock";

type Row = MockPlayer;

export default function PlayersAnalyticsPage() {
  const router = useRouter();

  const columns = [
    {
      id: "username",
      header: "Username",
      sortable: true,
      cell: (row: Row) => row.username,
    },
    {
      id: "userCode",
      header: "User Code",
      sortable: true,
      cell: (row: Row) => row.userCode,
    },
    {
      id: "type",
      header: "Type",
      sortable: true,
      cell: (row: Row) => row.type,
    },
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
    {
      id: "exposure",
      header: "Exposure",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.exposure)}`,
      sortValue: (row: Row) => row.exposure,
    },
    {
      id: "createdAt",
      header: "Created",
      sortable: true,
      cell: (row: Row) => formatDateTime(row.createdAt),
      sortValue: (row: Row) => Date.parse(row.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: Row) => {
        const id = row.id;
        if (!id) return null;
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/players/${id}`)}
            >
              Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/players/${id}/bets`)}
            >
              Bets
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/players/${id}/activity`)}
            >
              Activity
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/players/${id}/balance`)}
            >
              Balance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/players/${id}/exposure`)}
            >
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
        <StatsCard title="Total Players" value={mockPlayers.length.toString()} />
        <StatsCard
          title="Active Players"
          value={mockPlayers.filter((p) => p.status === "Active").length.toString()}
        />
        <StatsCard
          title="Suspended"
          value={mockPlayers.filter((p) => p.status === "Suspended").length.toString()}
        />
        <StatsCard
          title="Masters / Agents"
          value={mockPlayers.filter((p) => p.type !== "Player").length.toString()}
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
          rows={mockPlayers}
          initialSortColumnId="username"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search players…"
          getSearchText={(row: Row) =>
            `${row.username ?? ""} ${row.userCode ?? ""} ${row.type ?? ""} ${row.status ?? ""}`.toLowerCase()
          }
          emptyMessage="No players found."
        />
      </Card>
    </div>
  );
}

