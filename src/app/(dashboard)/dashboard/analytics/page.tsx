"use client";

import { useCallback } from "react";
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
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { downloadCsv } from "@/utils/csvDownload";

type Row = {
  id: string;
  metric: string;
  value: string;
};

const kpiColumns = [
  { id: "metric", header: "Metric", sortable: true, cell: (row: Row) => row.metric },
  { id: "value", header: "Value", sortable: true, cell: (row: Row) => row.value },
];

export default function DashboardAnalyticsPage() {
  const stats = useDashboardStats();
  const rows: Row[] = [
    { id: "1", metric: "Current Balance", value: stats.balance },
    { id: "2", metric: "Live Bet Stake", value: stats.liveBetStake },
    { id: "3", metric: "Total Markets", value: stats.totalMarket },
    { id: "4", metric: "Players", value: stats.players },
  ];

  const exportRows = useCallback(() => {
    downloadCsv(
      "dashboard-ggr-metrics.csv",
      ["Metric", "Value"],
      rows.map((r) => [r.metric, r.value]),
    );
  }, [rows]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6 px-6 py-6">
      <PageHeader
        title="GGR"
        breadcrumbs={["Reports", "GGR"]}
        action={
          <Button variant="primary" size="sm" type="button" onClick={exportRows}>
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Current Balance" value={stats.balance} />
        <StatsCard title="Live Bet Stake" value={stats.liveBetStake} />
        <StatsCard title="Active Users" value={stats.players} />
        <StatsCard title="Active Markets" value={stats.totalMarket} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <ListPageFrame>
            <div className="flex w-full flex-col justify-center gap-0">
              <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
                <Input type="date" className="max-w-[160px]" />
                <Input type="date" className="max-w-[160px]" />
                <Button variant="primary">Filter</Button>
              </FilterBar>
              <ListTableSection>
                <DataTable
                  enableSearch={false}
                  columns={kpiColumns}
                  rows={rows}
                  initialSortColumnId="metric"
                  initialSortDirection="asc"
                  searchPlaceholder="Search metrics…"
                  getSearchText={(row: Row) => row.metric.toLowerCase()}
                  emptyMessage="No analytics data."
                />
              </ListTableSection>
            </div>
          </ListPageFrame>
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

