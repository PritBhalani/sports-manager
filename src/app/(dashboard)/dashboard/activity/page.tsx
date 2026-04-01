"use client";

import { useEffect, useState } from "react";
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
import { formatDateTime } from "@/utils/date";
import { getLoginHistory } from "@/services/token.service";

type Row = Record<string, unknown>;

const columns = [
  {
    id: "createdAt",
    header: "Date / Time",
    sortable: true,
    cell: (row: Row) => formatDateTime(row.createdAt ?? row.date ?? row.timestamp),
    sortValue: (row: Row) => Date.parse(String(row.createdAt ?? row.date ?? row.timestamp ?? 0)),
  },
  { id: "type", header: "Type", sortable: true, cell: (row: Row) => String(row.type ?? row.eventType ?? "Login") },
  { id: "username", header: "User", sortable: true, cell: (row: Row) => String(row.username ?? row.userCode ?? row.userId ?? "—") },
];

export default function DashboardActivityPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getLoginHistory()
      .then((res) => setRows(Array.isArray(res) ? res : []))
      .catch(() => setRows([]));
  }, []);
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Dashboard Activity"
        breadcrumbs={["Dashboard", "Activity"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Events" value={rows.length.toString()} />
        <StatsCard
          title="Logins"
          value={rows.filter((a) => String(a.type ?? a.eventType ?? "").toLowerCase() === "login").length.toString()}
        />
        <StatsCard
          title="Sessions"
          value={rows.filter((a) => Boolean(a.sessionId ?? a.tokenId)).length.toString()}
        />
        <StatsCard
          title="Unique Users"
          value={new Set(rows.map((a) => String(a.username ?? a.userCode ?? a.userId ?? ""))).size.toString()}
        />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input type="date" className="max-w-[160px]" />
            <Input type="date" className="max-w-[160px]" />
            <Input placeholder="Filter by type or user" className="max-w-xs" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataTable
              enableSearch={false}
              columns={columns}
              rows={rows}
              initialSortColumnId="createdAt"
              initialSortDirection="desc"
              searchPlaceholder="Search activity…"
              getSearchText={(row: Row) =>
                `${row.type ?? row.eventType ?? ""} ${row.username ?? row.userCode ?? ""} ${row.ipAddress ?? row.ip ?? ""}`.toLowerCase()
              }
              emptyMessage="No activity."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

