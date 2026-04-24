"use client";

import { useMemo, useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  Button,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components";
import { usePagination } from "@/hooks/usePagination";
import { getBetHistoryByMarketId } from "@/services/betHistory.service";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { downloadCsv } from "@/utils/csvDownload";

const BETTING_TYPE_SESSION_FANCY = 7;

type BetRow = Record<string, unknown>;

function yn(v: unknown): string {
  return v ? "Y" : "N";
}

function oneClickLabel(betFrom: unknown): string {
  const n = Number(betFrom);
  if (Number.isFinite(n) && n > 1) return "Y";
  return "N";
}

function sideLabel(side: unknown, bettingType: unknown): string {
  const n = Number(side);
  const bt = Number(bettingType);
  if (bt === BETTING_TYPE_SESSION_FANCY) {
    if (n === 1) return "Yes";
    if (n === 2) return "No";
  }
  if (n === 1) return "Back";
  if (n === 2) return "Lay";
  return "—";
}

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

function statusTextClass(statusText: string): string {
  if (statusText === "LOST") return "font-medium text-error";
  if (statusText === "WON") return "font-medium text-success";
  return "";
}

function text(v: unknown, fallback = "—"): string {
  if (v === null || v === undefined) return fallback;
  const s = String(v);
  return s.trim() ? s : fallback;
}

function oddsDisplay(r: BetRow): string {
  const pct = r.percentage;
  if (pct !== undefined && pct !== null && String(pct).trim() !== "") {
    return text(pct);
  }
  return text(r.price ?? r.odds);
}

function AgentMarketBetsContent() {
  const params = useParams<{ marketId?: string }>();
  const searchParams = useSearchParams();
  const marketId = String(params?.marketId ?? "").trim();
  const memberId = String(searchParams.get("memberId") ?? "").trim();

  const { page, pageSize, setPage, setPageSize, pageSizeOptions } = usePagination();
  const [rows, setRows] = useState<BetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!marketId || !memberId) return;
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
      { marketId, status: "" },
      memberId,
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
  }, [marketId, memberId, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = useCallback(() => {
    const header = [
      "Member",
      "Placed",
      "Selection",
      "Bet ID",
      "In play",
      "1-Click",
      "Side",
      "Odds",
      "Stake",
      "Status",
      "Win/Loss",
      "IP",
    ];
    const out = rows.map((r) => {
      const user = (r.user ?? {}) as Record<string, unknown>;
      const member = text(user.username ?? user.userCode);
      const placed = formatDateTime(r.createdOn ?? r.createdAt ?? r.date);
      const selection = text(r.runnerName);
      const betId = text(r.betId ?? r.id, "");
      const inPlay = yn(Boolean(r.inPlay));
      const oneClick = oneClickLabel(r.betFrom);
      const side = sideLabel(r.side, r.bettingType);
      const odds = oddsDisplay(r);
      const stake = formatCurrency(r.size ?? r.stake);
      const pl = formatCurrency(r.pl ?? r.pnl ?? r.netWin);
      const statusText = statusLabel(r.status, r.pl ?? r.pnl);
      const ip = text(r.remoteIp ?? r.ipAddress);
      return [
        member,
        placed,
        selection,
        betId,
        inPlay,
        oneClick,
        side,
        odds,
        stake,
        statusText,
        pl,
        ip,
      ];
    });
    downloadCsv(`pl-by-agent-market-bets-${marketId || "market"}.csv`, header, out);
  }, [rows, marketId]);

  const missingParams = !marketId || !memberId;

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="P&L Report"
        breadcrumbs={[
          "Reports",
          "P&L by Agent",
          marketId && headerInfo.eventName
            ? `${headerInfo.eventName} - ${headerInfo.marketName}`
            : "View bets",
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/reports/pl-by-agent"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-foreground-secondary hover:bg-surface-muted"
            >
              Back to P&L by Agent
            </Link>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={exportCsv}
              disabled={rows.length === 0}
            >
              Download CSV
            </Button>
          </div>
        }
      />

      {missingParams ? (
        <p className="text-sm text-error" role="alert">
          Missing market or member. Open this page from
          <Link href="/reports/pl-by-agent" className="text-primary underline">
            P&L by Agent
          </Link>
          via <strong>View Bets</strong>.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <ListTableSection>
            <Table>
              <TableHeader>
                <TableHead>Member</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead>Selection</TableHead>
                <TableHead >Bet ID</TableHead>
                <TableHead >In Play</TableHead>
                <TableHead >1-Click</TableHead>
                <TableHead>Side</TableHead>
                <TableHead >Odds</TableHead>
                <TableHead >Stake</TableHead>
                <TableHead>Status</TableHead>
                <TableHead >Win/Loss</TableHead>
              </TableHeader>
              <TableBody>
                {missingParams ? (
                  <TableEmpty colSpan={12} message="Missing marketId or memberId in URL." />
                ) : loading ? (
                  <TableEmpty colSpan={12} message="Loading…" />
                ) : rows.length === 0 ? (
                  <TableEmpty colSpan={12} message="No bets for this market and member." />
                ) : (
                  rows.map((r, i) => {
                    const user = (r.user ?? {}) as Record<string, unknown>;
                    const member = text(user.username ?? user.userCode);
                    const placed = formatDateTime(r.createdOn ?? r.createdAt ?? r.date);
                    const selection = text(r.runnerName);
                    const betId = text(r.betId ?? r.id, "");
                    const inPlay = yn(Boolean(r.inPlay));
                    const oneClick = oneClickLabel(r.betFrom);
                    const side = sideLabel(r.side, r.bettingType);
                    const odds = oddsDisplay(r);
                    const stakeNum = Number(r.size ?? r.stake ?? 0);
                    const plNum = Number(r.pl ?? r.pnl ?? r.netWin ?? 0);
                    const statusText = statusLabel(r.status, r.pl ?? r.pnl);
                    return (
                      <TableRow key={text(r.id ?? r.betId ?? i)}>
                        <TableCell>{member}</TableCell>
                        <TableCell>{placed}</TableCell>
                        <TableCell>{selection}</TableCell>
                        <TableCell  className="tabular-nums">
                          {betId || "—"}
                        </TableCell>
                        <TableCell >{inPlay}</TableCell>
                        <TableCell >{oneClick}</TableCell>
                        <TableCell>{side}</TableCell>
                        <TableCell  className="tabular-nums">
                          {odds}
                        </TableCell>
                        <TableCell
                          className={`tabular-nums ${signedAmountTextClass(stakeNum)}`}
                        >
                          {formatCurrency(r.size ?? r.stake)}
                        </TableCell>
                        <TableCell className={statusTextClass(statusText)}>
                          {statusText}
                        </TableCell>
                        <TableCell
                          className={`tabular-nums ${signedAmountTextClass(plNum)}`}
                        >
                          {formatCurrency(r.pl ?? r.pnl ?? r.netWin)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {!missingParams && !loading && total > 0 ? (
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

export default function AgentMarketBetsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-8 text-sm text-muted">Loading…</div>
      }
    >
      <AgentMarketBetsContent />
    </Suspense>
  );
}
