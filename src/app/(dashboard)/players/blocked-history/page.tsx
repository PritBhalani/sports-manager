"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Button,
  StatsCard,
  DataTable,
  Badge,
} from "@/components";
import { formatDateTime } from "@/utils/date";
import { downloadCsv } from "@/utils/csvDownload";

type PlayerRow = {
  id: string;
  username: string;
  userCode: string;
  status: string;
  createdAt: string;
  event: string;
};

function statusBadgeVariant(status: string): "success" | "error" | "warning" | "default" | "info" {
  const s = status.toLowerCase();
  if (s.includes("unblocked")) return "success";
  if (s.includes("blocked")) return "error";
  if (s.includes("review")) return "warning";
  return "default";
}

function makeIsoDate(daysAgo: number): string {
  const base = new Date("2026-03-01T00:00:00.000Z");
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

export default function BlockedPlayerHistoryPage() {
  const router = useRouter();

  const exportBlockedHistoryCsv = () => {
    downloadCsv(
      "blocked-player-history.csv",
      ["ID", "Username", "User code", "Event", "Status", "Time"],
      rows.map((r) => [
        r.id,
        r.username,
        r.userCode,
        r.event,
        r.status,
        formatDateTime(r.createdAt),
      ]),
    );
  };

  const rows: PlayerRow[] = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, idx) => {
        const n = idx + 1;
        const isUnblocked = n % 3 === 0;
        return {
          id: `BLKH-${n}`,
          username: `blocked_history_user_${n}`,
          userCode: `U${20000 + n}`,
          status: isUnblocked ? "Unblocked" : "Blocked",
          event: isUnblocked ? "解除 (Unblock)" : "차단 (Block)",
          createdAt: makeIsoDate(n + 5),
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
        id: "event",
        header: "Event",
        sortable: true,
        cell: (row: PlayerRow) => row.event,
        sortValue: (row: PlayerRow) => row.event,
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
        header: "Time",
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
        title="Blocked Player History"
        breadcrumbs={["Reports", "Blocked Player History"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Events" value={String(rows.length)} />
        <StatsCard title="Unblocked" value={String(rows.filter((r) => r.status === "Unblocked").length)} />
        <StatsCard title="Blocked" value={String(rows.filter((r) => r.status === "Blocked").length)} />
        <StatsCard title="Latest Event" value={formatDateTime(rows[0]?.createdAt ?? "—")} />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input placeholder="Search history (client-side)" className="max-w-xs" />
            <Button variant="primary" type="button" onClick={exportBlockedHistoryCsv}>
              Export
            </Button>
          </FilterBar>
          <ListTableSection>
            <DataTable
              enableSearch={false}
              rows={rows}
              columns={columns}
              emptyMessage="No history yet."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

