"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
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
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { downloadCsv } from "@/utils/csvDownload";

function statusLabel(status: unknown, pl: unknown): string {
  const st = Number(status);
  const pnl = Number(pl);
  if (st === 2) {
    if (Number.isFinite(pnl) && pnl > 0) return "WON";
    if (Number.isFinite(pnl) && pnl < 0) return "LOST";
    return "SETTLED";
  }
  if (st === 1) return "OPEN";
  if (st === 0) return "PENDING";
  return Number.isFinite(st) ? String(st) : "—";
}

/** README §5: POST /bethistory/getbethistorybymarketid — bet history for a market */
export default function BetHistoryByMarketPage() {
  const { page, pageSize, setPage, setPageSize, pageSizeOptions } = usePagination();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketId, setMarketId] = useState("");
  const [status, setStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!marketId.trim()) return;
    setError(null);
    setLoading(true);
    getBetHistoryByMarketId(
      { page, pageSize, orderByDesc: false, groupBy: "", orderBy: "" },
      { marketId: marketId.trim(), status: status.trim() }
    )
      .then((res) => {
        setData(Array.isArray(res.items) ? res.items : []);
        setTotal(res.total ?? 0);
      })
      .catch((e) => {
        setData([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load bet history.");
      })
      .finally(() => setLoading(false));
  }, [marketId, status, page, pageSize, refreshKey]);

  const exportByMarketCsv = useCallback(() => {
    downloadCsv(
      `bet-history-by-market-${marketId.trim() || "market"}.csv`,
      ["Event / Market", "Selection", "Stake", "Odds", "Status", "Date"],
      data.map((row) => [
        String(row.eventName ?? row.marketName ?? ""),
        String(row.selection ?? row.runnerName ?? ""),
        Number(row.size ?? row.stake ?? 0),
        String(row.price ?? row.odds ?? ""),
        statusLabel(row.status, row.pl),
        formatDateTime(row.createdOn ?? row.createdAt ?? row.date),
      ]),
    );
  }, [data, marketId]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Bet History by Market"
        breadcrumbs={["Reports", "Bet History by Market"]}
        description="README §5: POST /bethistory/getbethistorybymarketid"
        action={
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={exportByMarketCsv}
            disabled={loading || data.length === 0}
          >
            Export
          </Button>
        }
      />
      {error && (
        <p className="mb-2 text-sm text-error" role="alert">{error}</p>
      )}
      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
        <Input
          placeholder="Market ID *"
          value={marketId}
          onChange={(e) => {
            setMarketId(e.target.value);
            setPage(1);
          }}
          className="max-w-[200px]"
        />
        <Input
          placeholder="Status (optional)"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="max-w-[160px]"
        />
        <Button
          variant="primary"
          type="button"
          onClick={() => {
            setPage(1);
            setRefreshKey((k) => k + 1);
          }}
          disabled={!marketId.trim()}
        >
          Apply
        </Button>
          </FilterBar>
          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>Event / Market</TableHead>
            <TableHead>Selection</TableHead>
            <TableHead >Stake</TableHead>
            <TableHead >Odds</TableHead>
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
              data.map((row, i) => {
                const stakeN = Number(row.size ?? row.stake ?? 0);
                return (
                <TableRow key={String(row.id ?? row.betId ?? i)}>
                  <TableCell>{String(row.eventName ?? row.marketName ?? "—")}</TableCell>
                  <TableCell>{String(row.selection ?? row.runnerName ?? "—")}</TableCell>
                  <TableCell  className={`tabular-nums ${signedAmountTextClass(stakeN)}`}>{formatCurrency(row.size ?? row.stake)}</TableCell>
                  <TableCell >{String(row.price ?? row.odds ?? "—")}</TableCell>
                  <TableCell>{statusLabel(row.status, row.pl)}</TableCell>
                  <TableCell>{formatDateTime(row.createdOn ?? row.createdAt ?? row.date)}</TableCell>
                </TableRow>
                );
              })
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
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
