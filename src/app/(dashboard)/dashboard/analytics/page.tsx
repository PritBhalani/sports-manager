"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable } from "@/components";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { useDashboardStats } from "@/hooks/useDashboardStats";

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
    { id: "2", metric: "Live Bet Total", value: stats.liveBetTotal },
    { id: "3", metric: "Total Markets", value: stats.totalMarket },
    { id: "4", metric: "Players", value: stats.players },
  ];

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6 px-6 py-6">
      <PageHeader
        title="Dashboard Analytics"
        breadcrumbs={["Dashboard", "Analytics"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Current Balance" value={stats.balance} />
        <StatsCard title="Live Bet Total" value={stats.liveBetTotal} />
        <StatsCard title="Active Users" value={stats.players} />
        <StatsCard title="Active Markets" value={stats.totalMarket} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <FilterBar className="mb-4">
              <Input type="date" className="max-w-[160px]" />
              <Input type="date" className="max-w-[160px]" />
              <Button variant="primary">Filter</Button>
            </FilterBar>
            <DataTable
              columns={kpiColumns}
              rows={rows}
              initialSortColumnId="metric"
              initialSortDirection="asc"
              enableSearch
              searchPlaceholder="Search metrics…"
              getSearchText={(row: Row) => row.metric.toLowerCase()}
              emptyMessage="No analytics data."
            />
          </Card>
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

