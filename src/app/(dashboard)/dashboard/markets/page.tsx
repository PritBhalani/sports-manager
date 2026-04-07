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
import { getPlByMarket } from "@/services/betHistory.service";
import { downloadCsv } from "@/utils/csvDownload";

type Row = Record<string, unknown>;

const columns = [
  { id: "sport", header: "Sport", sortable: true, cell: (row: Row) => String(row.sport ?? row.eventType ?? "—") },
  { id: "eventName", header: "Event", sortable: true, cell: (row: Row) => String(row.eventName ?? row.event ?? "—") },
  { id: "marketName", header: "Market", sortable: true, cell: (row: Row) => String(row.marketName ?? row.market ?? "—") },
  { id: "status", header: "Status", sortable: true, cell: (row: Row) => String(row.status ?? "—") },
];

export default function DashboardMarketsPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getPlByMarket({ page: 1, pageSize: 100, orderByDesc: true }, {})
      .then((res) => setRows((res.items ?? []) as Row[]))
      .catch(() => setRows([]));
  }, []);

  const exportRows = useCallback(() => {
    downloadCsv(
      "dashboard-markets.csv",
      ["Sport", "Event", "Market", "Status"],
      rows.map((m) => [
        String(m.sport ?? m.eventType ?? ""),
        String(m.eventName ?? m.event ?? ""),
        String(m.marketName ?? m.market ?? ""),
        String(m.status ?? ""),
      ]),
    );
  }, [rows]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Dashboard Markets"
        breadcrumbs={["Dashboard", "Markets"]}
        action={
          <Button variant="primary" size="sm" type="button" onClick={exportRows}>
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Markets" value={rows.length.toString()} />
        <StatsCard
          title="In-Play Markets"
          value={rows.filter((m) => String(m.status ?? "").toLowerCase() === "in-play").length.toString()}
        />
        <StatsCard
          title="Locked / Suspended"
          value={rows.filter((m) => String(m.status ?? "").toLowerCase() === "suspended").length.toString()}
        />
        <StatsCard
          title="Sports Covered"
          value={Array.from(new Set(rows.map((m) => String(m.sport ?? "")))).length.toString()}
        />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input placeholder="Filter by sport" className="max-w-xs" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataTable
              enableSearch={false}
              columns={columns}
              rows={rows}
              initialSortColumnId="sport"
              initialSortDirection="asc"
              searchPlaceholder="Search sports…"
              getSearchText={(row: Row) =>
                `${row.sport ?? ""} ${row.marketName ?? row.market ?? ""}`.toLowerCase()
              }
              emptyMessage="No markets."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

