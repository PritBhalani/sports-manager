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
  { id: "1", sport: "Cricket", exposure: -5000, markets: 10 },
  { id: "2", sport: "Football", exposure: -2000, markets: 6 },
];

const columns = [
  { id: "sport", header: "Sport", sortable: true, cell: (row: Row) => String(row.sport ?? "—") },
  { id: "exposure", header: "Exposure", sortable: true, cell: (row: Row) => String(row.exposure ?? "0") },
  { id: "markets", header: "Markets", sortable: true, cell: (row: Row) => String(row.markets ?? "0") },
];

export default function PositionAnalyticsPage() {
  const onExportCsv = () => {
    downloadCsv(
      "position-analytics.csv",
      ["Sport", "Exposure", "Markets"],
      rows.map((r) => [
        String(r.sport ?? ""),
        Number(r.exposure ?? 0),
        Number(r.markets ?? 0),
      ]),
    );
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Position Analytics"
        breadcrumbs={["Position", "Analytics"]}
        action={
          <Button variant="primary" size="sm" type="button" onClick={onExportCsv}>
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Exposure" value="0" />
        <StatsCard title="Most Exposed Sport" value="—" />
        <StatsCard title="Markets Exposed" value="0" />
        <StatsCard title="Events Exposed" value="0" />
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
                `${row.sport ?? ""}`.toLowerCase()
              }
              emptyMessage="No position analytics data."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

