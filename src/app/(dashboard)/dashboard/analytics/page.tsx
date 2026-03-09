"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable } from "@/components";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import { formatCurrency } from "@/utils/formatCurrency";
import { mockBets } from "@/mocks/bets.mock";
import { mockMarkets } from "@/mocks/markets.mock";
import { mockPlayers } from "@/mocks/players.mock";

type Row = {
  id: string;
  metric: string;
  value: string;
};

const totalVolume = mockBets.reduce((sum, b) => sum + b.stake, 0);
const totalBets = mockBets.length;
const activeMarkets = mockMarkets.filter((m) => m.status === "Open" || m.status === "In-Play").length;
const activePlayers = mockPlayers.filter((p) => p.status === "Active").length;

const rows: Row[] = [
  { id: "1", metric: "Total Volume (Today)", value: `₹ ${formatCurrency(totalVolume)}` },
  { id: "2", metric: "Total Bets (Today)", value: totalBets.toString() },
  { id: "3", metric: "Active Markets", value: activeMarkets.toString() },
  { id: "4", metric: "Active Players", value: activePlayers.toString() },
];

const kpiColumns = [
  { id: "metric", header: "Metric", sortable: true, cell: (row: Row) => row.metric },
  { id: "value", header: "Value", sortable: true, cell: (row: Row) => row.value },
];

export default function DashboardAnalyticsPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6 px-6 py-6">
      <PageHeader
        title="Dashboard Analytics"
        breadcrumbs={["Dashboard", "Analytics"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Volume (Today)" value={`₹ ${formatCurrency(totalVolume)}`} />
        <StatsCard title="Total Bets (Today)" value={totalBets.toString()} />
        <StatsCard title="Active Users" value={activePlayers.toString()} />
        <StatsCard title="Active Markets" value={activeMarkets.toString()} />
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

