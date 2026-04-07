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
} from "@/components";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";
import { getDownlineSummary, getPlByMarket } from "@/services/betHistory.service";
import { downloadCsv } from "@/utils/csvDownload";

export default function ReportsAnalyticsPage() {
  const router = useRouter();
  const [marketRows, setMarketRows] = useState<Record<string, unknown>[]>([]);
  const [downlineRows, setDownlineRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    getPlByMarket({ page: 1, pageSize: 100, orderByDesc: true }, {})
      .then((res) => setMarketRows((res.items ?? []) as Record<string, unknown>[]))
      .catch(() => setMarketRows([]));
    getDownlineSummary({ page: 1, pageSize: 100, orderByDesc: true }, {})
      .then((res) => setDownlineRows((res.items ?? []) as Record<string, unknown>[]))
      .catch(() => setDownlineRows([]));
  }, []);

  const columns = [
    {
      id: "marketName",
      header: "Market",
      sortable: true,
      cell: (row: Record<string, unknown>) => String(row.marketName ?? row.market ?? "—"),
    },
    {
      id: "sport",
      header: "Sport",
      sortable: true,
      cell: (row: Record<string, unknown>) => String(row.sport ?? row.eventType ?? "—"),
    },
    {
      id: "totalBets",
      header: "Bets",
      sortable: true,
      cell: (row: Record<string, unknown>) => String(row.totalBets ?? row.bets ?? "0"),
      sortValue: (row: Record<string, unknown>) => Number(row.totalBets ?? row.bets ?? 0),
    },
    {
      id: "stake",
      header: "Stake",
      sortable: true,
      cell: (row: Record<string, unknown>) => `₹ ${formatCurrency(row.stake ?? row.amount)}`,
      sortValue: (row: Record<string, unknown>) => Number(row.stake ?? row.amount ?? 0),
    },
    {
      id: "profitLoss",
      header: "Net P&L",
      sortable: true,
      cell: (row: Record<string, unknown>) => `₹ ${formatCurrency(row.profitLoss ?? row.pl)}`,
      sortValue: (row: Record<string, unknown>) => Number(row.profitLoss ?? row.pl ?? 0),
    },
    {
      id: "settledAt",
      header: "Settled At",
      sortable: true,
      cell: (row: Record<string, unknown>) => formatDateTime(row.settledAt ?? row.createdAt ?? row.date),
      sortValue: (row: Record<string, unknown>) => Date.parse(String(row.settledAt ?? row.createdAt ?? row.date ?? 0)),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: Record<string, unknown>) => {
        const id = String(row.marketId ?? row.id ?? "");
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
              onClick={() => router.push(`/reports/downline-summary/${String(row.userId ?? "")}`)}
            >
              View Downline
            </Button>
          </div>
        );
      },
    },
  ];

  const exportMarketsCsv = useCallback(() => {
    downloadCsv(
      "reports-analytics-markets.csv",
      ["Market", "Sport", "Bets", "Stake", "Net P&L", "Settled at", "Market ID", "User ID"],
      marketRows.map((row) => [
        String(row.marketName ?? row.market ?? ""),
        String(row.sport ?? row.eventType ?? ""),
        Number(row.totalBets ?? row.bets ?? 0),
        Number(row.stake ?? row.amount ?? 0),
        Number(row.profitLoss ?? row.pl ?? 0),
        formatDateTime(row.settledAt ?? row.createdAt ?? row.date),
        String(row.marketId ?? row.id ?? ""),
        String(row.userId ?? ""),
      ]),
    );
  }, [marketRows]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Reports Analytics"
        breadcrumbs={["Bet History", "Analytics"]}
        action={
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={exportMarketsCsv}
            disabled={marketRows.length === 0}
          >
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="P&L Markets" value={marketRows.length.toString()} />
        <StatsCard title="Downline Records" value={downlineRows.length.toString()} />
        <StatsCard
          title="Positive Markets"
          value={marketRows.filter((r) => Number(r.profitLoss ?? r.pl ?? 0) > 0).length.toString()}
        />
        <StatsCard
          title="Negative Markets"
          value={marketRows.filter((r) => Number(r.profitLoss ?? r.pl ?? 0) < 0).length.toString()}
        />
      </div>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input type="date" className="max-w-[160px]" />
            <Input type="date" className="max-w-[160px]" />
            <Input placeholder="Filter by type" className="max-w-xs" />
            <Button variant="primary">Filter</Button>
          </FilterBar>
          <ListTableSection>
            <DataTable
              enableSearch={false}
              columns={columns}
              rows={marketRows}
              initialSortColumnId="marketName"
              initialSortDirection="asc"
              searchPlaceholder="Search by market or sport…"
              getSearchText={(row: Record<string, unknown>) =>
                `${row.marketName ?? row.market ?? ""} ${row.sport ?? row.eventType ?? ""}`.toLowerCase()
              }
              emptyMessage="No reports."
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

