"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
import { usePagination } from "@/hooks/usePagination";
import { getBetHistoryByMarketId } from "@/services/betHistory.service";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

type BetRow = Record<string, unknown>;

function sideLabel(side: unknown): string {
  const n = Number(side);
  if (n === 1) return "Back";
  if (n === 2) return "Lay";
  return "—";
}

function yn(v: unknown): string {
  return v ? "Y" : "N";
}

function oneClickLabel(betFrom: unknown): string {
  // App doesn’t have a canonical mapping; keep deterministic.
  // If API sends betFrom=2/true for one-click, show Y; otherwise N.
  const n = Number(betFrom);
  if (Number.isFinite(n) && n > 1) return "Y";
  return "N";
}

function statusLabel(status: unknown, pl: unknown): string {
  // Try to match “WON/LOST” feel from screenshot while staying neutral.
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

function text(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v);
  return s.trim() ? s : fallback;
}

export default function PlByMarketDetailPage() {
  const params = useParams<{ marketId?: string }>();
  const marketId = String(params?.marketId ?? "").trim();

  const { page, pageSize, setPage, setPageSize, pageSizeOptions } = usePagination();
  const [rows, setRows] = useState<BetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const headerInfo = useMemo(() => {
    const first = rows[0] as BetRow | undefined;
    const market = (first?.market ?? {}) as Record<string, unknown>;
    const event = (market?.event ?? {}) as Record<string, unknown>;
    return {
      eventName: text(event?.name),
      marketName: text(market?.name),
    };
  }, [rows]);

  const load = useCallback(() => {
    if (!marketId) return;
    setLoading(true);
    setError(null);
    getBetHistoryByMarketId(
      {
        page,
        pageSize,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { marketId, status: status.trim() },
    )
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
      })
      .catch((e) => {
        setRows([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load bets.");
      })
      .finally(() => setLoading(false));
  }, [marketId, page, pageSize, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="P&L Report"
        breadcrumbs={["Reports", "P&L by Market"]}
        description={
          marketId
            ? `${headerInfo.eventName} - ${headerInfo.marketName}`
            : "Market bet history"
        }
        action={<Button variant="primary" size="sm">Download CSV</Button>}
      />

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input
              placeholder="Filter by status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="max-w-[160px]"
            />
            <Button variant="primary" type="button" onClick={() => load()}>
              Apply
            </Button>
          </FilterBar>
          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>Member</TableHead>
            <TableHead>Placed</TableHead>
            <TableHead>Selection</TableHead>
            <TableHead align="right">Bet ID</TableHead>
            <TableHead align="center">In Play</TableHead>
            <TableHead align="center">1-Click</TableHead>
            <TableHead>Side</TableHead>
            <TableHead align="right">Odds</TableHead>
            <TableHead align="right">Stake</TableHead>
            <TableHead>Status</TableHead>
            <TableHead align="right">Win/Loss</TableHead>
            <TableHead>IP Address</TableHead>
          </TableHeader>
          <TableBody>
            {!marketId ? (
              <TableEmpty colSpan={12} message="Missing market id." />
            ) : loading ? (
              <TableEmpty colSpan={12} message="Loading…" />
            ) : rows.length === 0 ? (
              <TableEmpty colSpan={12} message="No bets for this market." />
            ) : (
              rows.map((r, i) => {
                const user = (r.user ?? {}) as Record<string, unknown>;
                const member = text(user.username ?? user.userCode);
                const placed = formatDateTime(r.createdOn ?? r.createdAt ?? r.date);
                const selection = text(r.runnerName ?? r.selection);
                const betId = text(r.betId ?? r.id, "");
                const inPlay = yn(Boolean(r.inPlay));
                const oneClick = oneClickLabel(r.betFrom);
                const side = sideLabel(r.side);
                const odds = text(r.price ?? r.odds);
                const stake = formatCurrency(r.size ?? r.stake);
                const pl = formatCurrency(r.pl ?? r.pnl ?? r.netWin);
                const statusText = statusLabel(r.status, r.pl ?? r.pnl);
                const ip = text(r.remoteIp ?? r.ipAddress);

                return (
                  <TableRow key={text(r.id ?? r.betId ?? i)}>
                    <TableCell>{member}</TableCell>
                    <TableCell>{placed}</TableCell>
                    <TableCell>{selection}</TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {betId || "—"}
                    </TableCell>
                    <TableCell align="center">{inPlay}</TableCell>
                    <TableCell align="center">{oneClick}</TableCell>
                    <TableCell>{side}</TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {odds}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {stake}
                    </TableCell>
                    <TableCell>{statusText}</TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {pl}
                    </TableCell>
                    <TableCell>{ip}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
            </Table>

            {marketId && !loading && total > 0 ? (
              <TablePagination
                page={page}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={pageSizeOptions}
              />
            ) : null}
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

