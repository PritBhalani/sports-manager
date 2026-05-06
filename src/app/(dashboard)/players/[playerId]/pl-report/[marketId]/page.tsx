"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, PageHeader } from "@/components";
import { getBetHistoryByMarketId } from "@/services/betHistory.service";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";

export default function PlReportPage() {
  const { playerId, marketId } = useParams();
  const router = useRouter();

  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketName, setMarketName] = useState<string | null>(null);

  const betTypeLabel = (row: Record<string, unknown>) => {
    const side = Number(row.side ?? NaN);
    const bt = Number(row.bettingType ?? 0);
    if (bt === 7) {
      if (side === 1) return "Yes";
      if (side === 2) return "No";
    }
    if (side === 1) return "Back";
    if (side === 2) return "Lay";
    return "—";
  };

  const betStatusLabel = (row: Record<string, unknown>) => {
    const status = Number(row.status ?? 0);
    const pl = Number(row.pl ?? 0);
    const sizeMatched = Number(row.sizeMatched ?? 0);
    const sizeCancelled = Number(row.sizeCancelled ?? 0);

    if (status === 1) return "Unmatched";
    if (status === 2) {
      if (sizeCancelled > 0 && sizeMatched === 0) return "CNL";
      if (pl > 0) return "WON";
      if (pl < 0) return "LOST";
      if (pl === 0 && sizeMatched > 0) return "SETTLED";
      return "MATCHED";
    }
    if (status === 3) return "CNL";
    if (status === 4) return "VOIDED";
    return String(status || "—");
  };

  const betStatusClass = (status: string) => {
    if (status === "WON") return "text-success font-bold";
    if (status === "LOST") return "text-error font-bold";
    if (status === "CNL" || status === "VOIDED" || status === "Cancelled") return "text-warning font-bold";
    return "text-foreground";
  };

  const loadReport = useCallback(() => {
    if (!playerId || !marketId) return;
    setLoading(true);
    setError(null);

    getBetHistoryByMarketId(
      { pageSize: 50, page: 1 },
      { marketId: marketId as string },
      playerId as string,
    )
      .then((res: any) => {
        const items = res.items || [];
        setRows(items);
        if (items.length > 0) {
          const m = items[0].market || {};
          const event = m.event || {};
          setMarketName(`${event.name || ""} - ${m.name || ""} ${m.roundId || ""}`);
        }
      })
      .catch((e: any) => {
        setRows([]);
        setError(e instanceof Error ? e.message : "Failed to load report.");
      })
      .finally(() => setLoading(true)); // wait, I set it to true again? No, false.
  }, [playerId, marketId]);

  useEffect(() => {
    // Fixed the loading state logic
    if (!playerId || !marketId) return;
    setLoading(true);
    setError(null);

    getBetHistoryByMarketId(
      { pageSize: 50, page: 1 },
      { marketId: marketId as string },
      playerId as string,
    )
      .then((res: any) => {
        const items = res.items || [];
        setRows(items);
        if (items.length > 0) {
          const m = items[0].market || {};
          const event = m.event || {};
          setMarketName(`${event.name || ""} - ${m.name || ""} ${m.roundId || ""}`);
        }
      })
      .catch((e: any) => {
        setRows([]);
        setError(e instanceof Error ? e.message : "Failed to load report.");
      })
      .finally(() => setLoading(false));
  }, [playerId, marketId]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="P&L Report"
        breadcrumbs={["Players", "Detail", "P&L Report"]}
      />

      <Card padded={false}>
        <div className="px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-3">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xl font-bold text-foreground">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="text-primary hover:text-primary/80"
                >
                  &gt;
                </button>
                <span>P&L Report</span>
              </div>
              <button
                type="button"
                className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Download CSV
              </button>
            </div>

            <div className="text-sm font-bold text-foreground-secondary">
              {marketName || (loading ? "Loading..." : "N/A")}
            </div>

            {error && (
              <div className="rounded-md bg-error/10 p-3 text-sm text-error" role="alert">
                {error}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/70">
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-foreground-tertiary">Member</th>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-foreground-tertiary">Placed</th>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-foreground-tertiary">Selection</th>
                    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-foreground-tertiary">Bet ID</th>
                    <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-foreground-tertiary">In Play</th>
                    <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-foreground-tertiary">1-Click</th>
                    <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-foreground-tertiary">Side</th>
                    <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-foreground-tertiary">Odds</th>
                    <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-foreground-tertiary">Stake</th>
                    <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-foreground-tertiary">Status</th>
                    <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-foreground-tertiary">Win/Loss</th>
                    <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-foreground-tertiary">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={12} className="py-20 text-center text-muted">Loading...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={12} className="py-20 text-center text-muted">No records found.</td></tr>
                  ) : (
                    rows.map((row, idx) => {
                      const r = row as Record<string, any>;
                      const odds = Number(r.avgPrice ?? r.price ?? 0);
                      const stake = Number(r.sizeMatched ?? r.size ?? 0);
                      const winLoss = Number(r.pl ?? 0);
                      const status = betStatusLabel(r);
                      const side = betTypeLabel(r);
                      const user = (r.user ?? {}) as any;

                      return (
                        <tr key={idx} className="border-b border-border hover:bg-surface-muted/40">
                          <td className="px-3 py-2.5 text-sm font-medium text-foreground">{user.username || "—"}</td>
                          <td className="px-3 py-2.5 text-xs text-foreground-secondary">{formatDateTime(r.createdOn)}</td>
                          <td className="px-3 py-2.5 text-sm text-foreground">{r.runnerName || "—"}</td>
                          <td className="px-3 py-2.5 text-sm font-mono text-foreground-secondary">{r.betId || "—"}</td>
                          <td className="px-3 py-2.5 text-center text-sm text-foreground">{r.inPlay ? "Y" : "N"}</td>
                          <td className="px-3 py-2.5 text-center text-sm text-foreground">{r.betFrom === 2 ? "Y" : "N"}</td>
                          <td className="px-3 py-2.5 text-center text-sm text-foreground">{side}</td>
                          <td className="px-3 py-2.5 text-right text-sm tabular-nums font-medium text-foreground">{odds}</td>
                          <td className="px-3 py-2.5 text-right text-sm tabular-nums font-medium text-foreground">{stake}</td>
                          <td className={`px-3 py-2.5 text-center text-xs tabular-nums ${betStatusClass(status)}`}>{status}</td>
                          <td className={`px-3 py-2.5 text-right text-sm tabular-nums font-bold ${signedAmountTextClass(winLoss)}`}>
                            {formatCurrency(winLoss)}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-foreground-secondary">{r.remoteIp || "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
