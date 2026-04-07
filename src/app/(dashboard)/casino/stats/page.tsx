"use client";

import { useCallback, useEffect, useState } from "react";
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
import { downloadCsv } from "@/utils/csvDownload";

type Row = Record<string, unknown>;

const columns = [
  { id: "type", header: "Event Type", sortable: true, cell: (row: Row) => String(row.type ?? row.eventType ?? "Login") },
  { id: "module", header: "Module", sortable: true, cell: (row: Row) => String(row.module ?? "Security") },
  { id: "username", header: "User", sortable: true, cell: (row: Row) => String(row.username ?? row.userCode ?? row.userId ?? "—") },
  {
    id: "createdAt",
    header: "Time",
    sortable: true,
    cell: (row: Row) => formatDateTime(row.createdAt ?? row.date ?? row.timestamp),
    sortValue: (row: Row) => Date.parse(String(row.createdAt ?? row.date ?? row.timestamp ?? 0)),
  },
  { id: "ipAddress", header: "IP", sortable: true, cell: (row: Row) => String(row.ipAddress ?? row.ip ?? "—") },
  { id: "device", header: "Device", sortable: true, cell: (row: Row) => String(row.device ?? row.userAgent ?? "—") },
];

export default function CasinoStatsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getLoginHistory()
      .then((res) => setRows(Array.isArray(res) ? res : []))
      .catch(() => setRows([]));
  }, []);

  const exportCasinoStatsCsv = useCallback(() => {
    downloadCsv(
      "casino-stats.csv",
      ["Event type", "Module", "User", "Time", "IP", "Device"],
      rows.map((row) => [
        String(row.type ?? row.eventType ?? "Login"),
        String(row.module ?? "Security"),
        String(row.username ?? row.userCode ?? row.userId ?? ""),
        formatDateTime(row.createdAt ?? row.date ?? row.timestamp),
        String(row.ipAddress ?? row.ip ?? ""),
        String(row.device ?? row.userAgent ?? ""),
      ]),
    );
  }, [rows]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Casino | Stats"
        breadcrumbs={["Casino", "Stats"]}
        action={
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={exportCasinoStatsCsv}
            disabled={rows.length === 0}
          >
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Events" value={rows.length.toString()} />
        <StatsCard
          title="Logins"
          value={rows.filter((a) => String(a.type ?? a.eventType ?? "").toLowerCase() === "login").length.toString()}
        />
        <StatsCard
          title="Known IPs"
          value={new Set(rows.map((a) => String(a.ipAddress ?? a.ip ?? ""))).size.toString()}
        />
        <StatsCard
          title="Devices"
          value={new Set(rows.map((a) => String(a.device ?? a.userAgent ?? ""))).size.toString()}
        />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input type="date" className="max-w-[160px]" />
            <Input type="date" className="max-w-[160px]" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataTable
              columns={columns}
              rows={rows}
              initialSortColumnId="createdAt"
              initialSortDirection="asc"
              enableSearch
              searchPlaceholder="Search events…"
              getSearchText={(row: Row) =>
                `${row.type ?? row.eventType ?? ""} ${row.username ?? ""} ${row.ipAddress ?? row.ip ?? ""}`.toLowerCase()
              }
              emptyMessage="No security analytics data."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
