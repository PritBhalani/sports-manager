"use client";

import { useRouter } from "next/navigation";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable } from "@/components";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";
import { mockProfitLossByMarket, mockDownlineSummary, MockProfitLossRow, MockDownlineSummaryRow } from "@/mocks/reports.mock";

export default function ReportsAnalyticsPage() {
  const router = useRouter();

  const columns = [
    {
      id: "marketName",
      header: "Market",
      sortable: true,
      cell: (row: MockProfitLossRow) => row.marketName,
    },
    {
      id: "sport",
      header: "Sport",
      sortable: true,
      cell: (row: MockProfitLossRow) => row.sport,
    },
    {
      id: "totalBets",
      header: "Bets",
      sortable: true,
      cell: (row: MockProfitLossRow) => row.totalBets.toString(),
      sortValue: (row: MockProfitLossRow) => row.totalBets,
    },
    {
      id: "stake",
      header: "Stake",
      sortable: true,
      cell: (row: MockProfitLossRow) => `₹ ${formatCurrency(row.stake)}`,
      sortValue: (row: MockProfitLossRow) => row.stake,
    },
    {
      id: "profitLoss",
      header: "Net P&L",
      sortable: true,
      cell: (row: MockProfitLossRow) => `₹ ${formatCurrency(row.profitLoss)}`,
      sortValue: (row: MockProfitLossRow) => row.profitLoss,
    },
    {
      id: "settledAt",
      header: "Settled At",
      sortable: true,
      cell: (row: MockProfitLossRow) => formatDateTime(row.settledAt),
      sortValue: (row: MockProfitLossRow) => Date.parse(row.settledAt),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: MockProfitLossRow) => {
        const id = row.marketId;
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/reports/pl-by-market/${id}`)}
            >
              View Market P&L
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/reports/downline-summary/${row.userId}`)}
            >
              View Downline
            </Button>
          </div>
        );
      },
    },
  ];
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Reports Analytics"
        breadcrumbs={["Bet History", "Analytics"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="P&L Markets" value={mockProfitLossByMarket.length.toString()} />
        <StatsCard title="Downline Records" value={mockDownlineSummary.length.toString()} />
        <StatsCard
          title="Positive Markets"
          value={mockProfitLossByMarket.filter((r) => r.profitLoss > 0).length.toString()}
        />
        <StatsCard
          title="Negative Markets"
          value={mockProfitLossByMarket.filter((r) => r.profitLoss < 0).length.toString()}
        />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Input placeholder="Filter by type" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={mockProfitLossByMarket}
          initialSortColumnId="marketName"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search by market or sport…"
          getSearchText={(row: MockProfitLossRow) =>
            `${row.marketName} ${row.sport}`.toLowerCase()
          }
          emptyMessage="No reports."
        />
      </Card>
    </div>
  );
}

