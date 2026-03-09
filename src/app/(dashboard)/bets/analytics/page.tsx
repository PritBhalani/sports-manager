"use client";

import { useRouter } from "next/navigation";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable, Badge } from "@/components";
import { formatCurrency } from "@/utils/formatCurrency";
import { mockBets, MockBet } from "@/mocks/bets.mock";

type Row = MockBet;

export default function BetsAnalyticsPage() {
  const router = useRouter();

  const columns = [
    { id: "sport", header: "Sport", sortable: true, cell: (row: Row) => row.sport },
    { id: "market", header: "Market", sortable: true, cell: (row: Row) => row.market },
    {
      id: "stake",
      header: "Stake",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.stake)}`,
      sortValue: (row: Row) => row.stake,
    },
    {
      id: "potentialPayout",
      header: "Potential Payout",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.potentialPayout)}`,
      sortValue: (row: Row) => row.potentialPayout,
    },
    {
      id: "result",
      header: "Result",
      sortable: true,
      cell: (row: Row) => (
        <Badge
          variant={
            row.result === "Won"
              ? "success"
              : row.result === "Lost"
              ? "error"
              : row.result === "Pending"
              ? "warning"
              : "default"
          }
        >
          {row.result}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: Row) => {
        const id = row.id;
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/reports/pl-by-market/${id}`)}
            >
              View P&L
            </Button>
          </div>
        );
      },
    },
  ];
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Bets Analytics"
        breadcrumbs={["Bet", "Analytics"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Bets (Today)" value="0" />
        <StatsCard title="Total Volume (Today)" value="0" />
        <StatsCard title="Average Stake" value="0" />
        <StatsCard title="Net P&L (Today)" value="0" />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Input placeholder="Filter by sport" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={mockBets}
          initialSortColumnId="sport"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search by sport…"
          getSearchText={(row: Row) =>
            `${row.sport ?? ""}`.toLowerCase()
          }
          emptyMessage="No bet analytics data."
        />
      </Card>
    </div>
  );
}

