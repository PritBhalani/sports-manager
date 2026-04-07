"use client";

import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Button,
  StatsCard,
  DataGrid,
} from "@/components";
import { downloadCsv } from "@/utils/csvDownload";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", user: "downline001", bets: 50, pnl: 300 },
  { id: "2", user: "downline002", bets: 30, pnl: -100 },
];

const columns = [
  { id: "user", header: "User", sortable: true, cell: (row: Row) => String(row.user ?? "—") },
  { id: "bets", header: "Bets", sortable: true, cell: (row: Row) => String(row.bets ?? "0") },
  { id: "pnl", header: "P&L", sortable: true, cell: (row: Row) => String(row.pnl ?? "0") },
];

export default function DownlineSummaryDetailPage() {
  const onExportCsv = () => {
    downloadCsv(
      "downline-summary-detail.csv",
      ["User", "Bets", "P&L"],
      rows.map((r) => [
        String(r.user ?? ""),
        Number(r.bets ?? 0),
        Number(r.pnl ?? 0),
      ]),
    );
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Downline Summary Detail"
        breadcrumbs={["Bet History", "Downline Summary", "Detail"]}
        action={
          <Button variant="primary" size="sm" type="button" onClick={onExportCsv}>
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Downline Users" value="0" />
        <StatsCard title="Total Bets" value="0" />
        <StatsCard title="Total P&L" value="0" />
        <StatsCard title="Net P&L" value="0" />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input placeholder="Filter by user" className="max-w-xs" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataGrid
              enableSearch={false}
              columns={columns}
              rows={rows}
              initialSortColumnId="user"
              initialSortDirection="asc"
              searchPlaceholder="Search downline users…"
              getSearchText={(row: Row) =>
                `${row.user ?? ""}`.toLowerCase()
              }
              emptyMessage="No downline data."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

