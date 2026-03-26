"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  Card,
  FilterBar,
  Input,
  Button,
  StatsCard,
  DataTable,
  Badge,
} from "@/components";
import { formatDateTime } from "@/utils/date";

type PlayerRow = {
  id: string;
  username: string;
  userCode: string;
  status: string;
  createdAt: string;
};

function statusBadgeVariant(status: string): "success" | "error" | "warning" | "default" | "info" {
  const s = status.toLowerCase();
  if (s.includes("zero")) return "warning";
  if (s.includes("active")) return "success";
  return "default";
}

function makeIsoDate(daysAgo: number): string {
  const base = new Date("2026-03-01T00:00:00.000Z");
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

export default function ZeroDepositPlayersPage() {
  const router = useRouter();

  const rows: PlayerRow[] = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, idx) => {
        const n = idx + 1;
        return {
          id: `ZDP-${n}`,
          username: `zero_deposit_user_${n}`,
          userCode: `Z${60000 + n}`,
          status: "Zero Deposit Players",
          createdAt: makeIsoDate(n + 7),
        };
      }),
    [],
  );

  const columns = useMemo(
    () => [
      {
        id: "username",
        header: "Username",
        sortable: true,
        cell: (row: PlayerRow) => <span className="font-medium">{row.username}</span>,
        sortValue: (row: PlayerRow) => row.username,
      },
      {
        id: "userCode",
        header: "User Code",
        sortable: true,
        cell: (row: PlayerRow) => row.userCode,
        sortValue: (row: PlayerRow) => row.userCode,
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        cell: (row: PlayerRow) => (
          <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
        ),
        sortValue: (row: PlayerRow) => row.status,
      },
      {
        id: "createdAt",
        header: "Registered",
        sortable: true,
        cell: (row: PlayerRow) => formatDateTime(row.createdAt),
        sortValue: (row: PlayerRow) => Date.parse(row.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        cell: (row: PlayerRow) => (
          <Button variant="secondary" size="sm" onClick={() => router.push(`/players/${row.id}`)}>
            View Details
          </Button>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Zero Deposit Players"
        breadcrumbs={["Reports", "Zero Deposit Players"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Zero Deposit" value={String(rows.length)} />
        <StatsCard title="Risk Level" value="High" subStats={[{ label: "Unconverted", value: "15" }]} />
        <StatsCard title="Conversion Ready" value="3" />
        <StatsCard title="Latest Player" value={formatDateTime(rows[0]?.createdAt ?? "—")} />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input placeholder="Search zero deposit users" className="max-w-xs" />
          <Button variant="primary">Export</Button>
        </FilterBar>
        <DataTable rows={rows} columns={columns} emptyMessage="No zero deposit players found." />
      </Card>
    </div>
  );
}

