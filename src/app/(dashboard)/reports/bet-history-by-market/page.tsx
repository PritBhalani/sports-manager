"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  FilterBar,
  Input,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
  Button,
} from "@/components";
import { getBetHistoryByMarketId } from "@/services/betHistory.service";
import { usePagination } from "@/hooks/usePagination";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

/** README §5: POST /bethistory/getbethistorybymarketid — bet history for a market */
export default function BetHistoryByMarketPage() {
  const { page, pageSize, setPage, setPageSize, pageSizeOptions } = usePagination();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketId, setMarketId] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!marketId.trim()) return;
    setError(null);
    setLoading(true);
    getBetHistoryByMarketId(
      { page, pageSize, orderByDesc: true },
      { marketId: marketId.trim(), status: status.trim() || undefined }
    )
      .then((res) => {
        const list = res?.data ?? [];
        setData(Array.isArray(list) ? list : []);
        setTotal(res?.total ?? 0);
      })
      .catch((e) => {
        setData([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load bet history.");
      })
      .finally(() => setLoading(false));
  }, [marketId, status, page, pageSize]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Bet History by Market"
        breadcrumbs={["Reports", "Bet History by Market"]}
        description="README §5: POST /bethistory/getbethistorybymarketid"
        action={<Button variant="primary" size="sm">Export</Button>}
      />
      {error && (
        <p className="mb-2 text-sm text-red-600" role="alert">{error}</p>
      )}
      <FilterBar className="mb-4">
        <Input
          placeholder="Market ID *"
          value={marketId}
          onChange={(e) => setMarketId(e.target.value)}
          className="max-w-[200px]"
        />
        <Input
          placeholder="Status (optional)"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="max-w-[160px]"
        />
      </FilterBar>
      <Card>
        <Table>
          <TableHeader>
            <TableHead>Event / Market</TableHead>
            <TableHead>Selection</TableHead>
            <TableHead align="right">Stake</TableHead>
            <TableHead align="right">Odds</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableHeader>
          <TableBody>
            {!marketId.trim() ? (
              <TableEmpty colSpan={6} message="Enter Market ID and click Load." />
            ) : loading ? (
              <TableEmpty colSpan={6} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={6} message="No bet history for this market." />
            ) : (
              data.map((row, i) => (
                <TableRow key={String(row.id ?? row.betId ?? i)}>
                  <TableCell>{String(row.eventName ?? row.marketName ?? "—")}</TableCell>
                  <TableCell>{String(row.selection ?? row.runnerName ?? "—")}</TableCell>
                  <TableCell align="right">{formatCurrency(row.stake)}</TableCell>
                  <TableCell align="right">{String(row.odds ?? "—")}</TableCell>
                  <TableCell>{String(row.status ?? "—")}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt ?? row.date)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {marketId.trim() && data.length > 0 && (
          <TablePagination
            page={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={pageSizeOptions}
          />
        )}
      </Card>
    </div>
  );
}
