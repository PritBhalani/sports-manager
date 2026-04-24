"use client";

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
import { downloadCsv } from "@/utils/csvDownload";

type Row = Record<string, unknown>;

const rows: Row[] = [
  { id: "1", user: "player001", selection: "Team A", stake: 100, odds: 1.8, pnl: 20 },
  { id: "2", user: "player002", selection: "Team B", stake: 50, odds: 2.2, pnl: -50 },
];

const columns = [
  { id: "user", header: "User", sortable: true, cell: (row: Row) => String(row.user ?? "—") },
  { id: "selection", header: "Selection", sortable: true, cell: (row: Row) => String(row.selection ?? "—") },
  { id: "stake", header: "Stake", sortable: true, cell: (row: Row) => String(row.stake ?? "0") },
  { id: "odds", header: "Odds", sortable: true, cell: (row: Row) => String(row.odds ?? "—") },
  { id: "pnl", header: "P&L", sortable: true, cell: (row: Row) => String(row.pnl ?? "0") },
];

export default function MarketBetsPage() {
  const onExportCsv = () => {
    downloadCsv(
      "market-bets.csv",
      ["User", "Selection", "Stake", "Odds", "P&L"],
      rows.map((r) => [
        String(r.user ?? ""),
        String(r.selection ?? ""),
        Number(r.stake ?? 0),
        Number(r.odds ?? 0),
        Number(r.pnl ?? 0),
      ]),
    );
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Market Bets"
        breadcrumbs={["Manage Market", "Market", "Bets"]}
        action={
          <Button variant="primary" size="sm" type="button" onClick={onExportCsv}>
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Bets" value="0" />
        <StatsCard title="Total Volume" value="0" />
        <StatsCard title="Average Stake" value="0" />
        <StatsCard title="Net P&L" value="0" />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input placeholder="Filter by user or selection" className="max-w-xs" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataTable
              enableSearch={false}
              columns={columns}
              rows={rows}
              initialSortColumnId="user"
              initialSortDirection="asc"
              searchPlaceholder="Search bets…"
              getSearchText={(row: Row) =>
                `${row.user ?? ""} ${row.selection ?? ""}`.toLowerCase()
              }
              emptyMessage="No bets for this market."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

