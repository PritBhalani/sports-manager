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
  { id: "1", user: "player001", stake: 1000, pnl: 150 },
  { id: "2", user: "player002", stake: 700, pnl: -20 },
];

const columns = [
  { id: "user", header: "User", sortable: true, cell: (row: Row) => String(row.user ?? "—") },
  { id: "stake", header: "Stake", sortable: true, cell: (row: Row) => String(row.stake ?? "0") },
  { id: "pnl", header: "P&L", sortable: true, cell: (row: Row) => String(row.pnl ?? "0") },
];

export default function PlByAgentDetailPage() {
  const onExportCsv = () => {
    downloadCsv(
      "pl-by-agent-detail.csv",
      ["User", "Stake", "P&L"],
      rows.map((r) => [
        String(r.user ?? ""),
        Number(r.stake ?? 0),
        Number(r.pnl ?? 0),
      ]),
    );
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="P&L by Agent Detail"
        breadcrumbs={["Bet History", "P&L by Agent", "Detail"]}
        action={
          <Button variant="primary" size="sm" type="button" onClick={onExportCsv}>
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total P&L" value="0" />
        <StatsCard title="Total Stake" value="0" />
        <StatsCard title="Winning Users" value="0" />
        <StatsCard title="Losing Users" value="0" />
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
              searchPlaceholder="Search users…"
              getSearchText={(row: Row) =>
                `${row.user ?? ""}`.toLowerCase()
              }
              emptyMessage="No P&L data for this agent."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

