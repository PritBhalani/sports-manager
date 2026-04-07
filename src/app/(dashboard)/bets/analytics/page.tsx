"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Button,
  StatsCard,
  DataTable,
  Badge,
} from "@/components";
import { formatCurrency } from "@/utils/formatCurrency";
import { getLiveBets } from "@/services/bet.service";
import { downloadCsv } from "@/utils/csvDownload";

type Row = Record<string, unknown>;

export default function BetsAnalyticsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => {
    getLiveBets({ page: 1, pageSize: 100, orderByDesc: true }, {})
      .then((res) => setRows((res.items ?? []) as Row[]))
      .catch(() => setRows([]));
  }, []);

  const columns = [
    { id: "sport", header: "Sport", sortable: true, cell: (row: Row) => String(row.sport ?? row.eventType ?? "—") },
    { id: "market", header: "Market", sortable: true, cell: (row: Row) => String(row.market ?? row.marketName ?? "—") },
    {
      id: "stake",
      header: "Stake",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.stake ?? row.amount)}`,
      sortValue: (row: Row) => Number(row.stake ?? row.amount ?? 0),
    },
    {
      id: "potentialPayout",
      header: "Potential Payout",
      sortable: true,
      cell: (row: Row) => `₹ ${formatCurrency(row.potentialPayout ?? row.payout)}`,
      sortValue: (row: Row) => Number(row.potentialPayout ?? row.payout ?? 0),
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
          {String(row.result ?? row.status ?? "Unknown")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: Row) => {
        const id = String(row.id ?? row.marketId ?? "");
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

  const exportBetsAnalyticsCsv = useCallback(() => {
    downloadCsv(
      "bets-analytics.csv",
      ["Sport", "Market", "Stake", "Potential payout", "Result", "Bet/Market ID"],
      rows.map((row) => [
        String(row.sport ?? row.eventType ?? ""),
        String(row.market ?? row.marketName ?? ""),
        Number(row.stake ?? row.amount ?? 0),
        Number(row.potentialPayout ?? row.payout ?? 0),
        String(row.result ?? row.status ?? ""),
        String(row.id ?? row.marketId ?? ""),
      ]),
    );
  }, [rows]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Bets Analytics"
        breadcrumbs={["Bet", "Analytics"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Bets (Today)" value={rows.length.toString()} />
        <StatsCard title="Total Volume (Today)" value={`₹ ${formatCurrency(rows.reduce((sum, row) => sum + Number(row.stake ?? row.amount ?? 0), 0))}`} />
        <StatsCard title="Average Stake" value={`₹ ${formatCurrency(rows.length ? rows.reduce((sum, row) => sum + Number(row.stake ?? row.amount ?? 0), 0) / rows.length : 0)}`} />
        <StatsCard title="Open / Pending" value={rows.filter((row) => String(row.result ?? row.status ?? "").toLowerCase() === "pending").length.toString()} />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input type="date" className="max-w-[170px]" />
            <Input type="date" className="max-w-[170px]" />
            {showMoreFilters ? (
              <Input placeholder="Filter by sport" className="max-w-xs" />
            ) : (
              <div className="hidden lg:block" />
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowMoreFilters((v) => !v)}
              >
                More Filters
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={exportBetsAnalyticsCsv}
                disabled={rows.length === 0}
              >
                Export
              </Button>
            </div>
          </FilterBar>
          <ListTableSection>
            <DataTable
              enableSearch={false}
              columns={columns}
              rows={rows}
              initialSortColumnId="sport"
              initialSortDirection="asc"
              searchPlaceholder="Search by sport…"
              getSearchText={(row: Row) =>
                `${row.sport ?? ""} ${row.market ?? row.marketName ?? ""}`.toLowerCase()
              }
              emptyMessage="No bet analytics data."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

