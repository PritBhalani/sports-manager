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
  { id: "1", selection: "Team A", exposure: -300 },
  { id: "2", selection: "Team B", exposure: 200 },
];

const columns = [
  { id: "selection", header: "Selection", sortable: true, cell: (row: Row) => String(row.selection ?? "—") },
  { id: "exposure", header: "Exposure", sortable: true, cell: (row: Row) => String(row.exposure ?? "0") },
];

export default function MarketPositionDetailPage() {
  const onExportCsv = () => {
    downloadCsv(
      "market-position-detail.csv",
      ["Selection", "Exposure"],
      rows.map((r) => [String(r.selection ?? ""), Number(r.exposure ?? 0)]),
    );
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Market Position Detail"
        breadcrumbs={["Position", "Market", "Detail"]}
        action={
          <Button variant="primary" size="sm" type="button" onClick={onExportCsv}>
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Exposure" value="0" />
        <StatsCard title="Selections" value="0" />
        <StatsCard title="Max Exposure" value="0" />
        <StatsCard title="Net P&L" value="0" />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input placeholder="Filter by selection" className="max-w-xs" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataTable
              enableSearch={false}
              columns={columns}
              rows={rows}
              initialSortColumnId="selection"
              initialSortDirection="asc"
              searchPlaceholder="Search selections…"
              getSearchText={(row: Row) =>
                `${row.selection ?? ""}`.toLowerCase()
              }
              emptyMessage="No position data for this market."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

