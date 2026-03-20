"use client";

import { useState, useEffect } from "react";
import {
  type BetSummaryRow,
  type LiveBetSummaryRow,
  getTotalMarket,
  getUserSummary,
  getLiveBetTotal,
  getBetSummary,
  getLiveBetSummary,
} from "@/services/dashboard.service";
import { getBalance } from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { useAuth } from "@/hooks/useAuth";

export type DashboardStats = {
  balance: string;
  creditLimit: string;
  givenCredit: string;
  availableCredit: string;
  totalMarket: string;
  inplayMarkets: string;
  players: string;
  playersLive: string;
  ggr: string;
  exposure: string;
  totalStake: string;
  liveBetStake: string;
  liveBetCount: string;
};

const initialStats: DashboardStats = {
  balance: "0",
  creditLimit: "0",
  givenCredit: "0",
  availableCredit: "0",
  totalMarket: "0",
  inplayMarkets: "0",
  players: "0",
  playersLive: "0",
  ggr: "0",
  exposure: "0",
  totalStake: "0",
  liveBetStake: "0",
  liveBetCount: "0",
};

function sumNumber<T>(
  rows: T[] | null,
  getValue: (row: T) => number | null | undefined,
): number {
  if (!rows?.length) return 0;
  return rows.reduce((sum, row) => sum + (getValue(row) ?? 0), 0);
}

export function useDashboardStats(): DashboardStats {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(initialStats);

  useEffect(() => {
    if (!isAuthenticated) return;
    const load = async () => {
      try {
        const [bal, market, userSum, liveTotal, betSum, liveSum] = await Promise.allSettled([
          getBalance(),
          getTotalMarket(),
          getUserSummary(),
          getLiveBetTotal(),
          getBetSummary(),
          getLiveBetSummary(),
        ]);
        const b = bal.status === "fulfilled" ? bal.value : null;
        const m = market.status === "fulfilled" ? market.value : null;
        const u = userSum.status === "fulfilled" ? userSum.value : null;
        const lt = liveTotal.status === "fulfilled" ? liveTotal.value : null;
        const bs = betSum.status === "fulfilled" ? betSum.value : [];
        const ls = liveSum.status === "fulfilled" ? liveSum.value : [];

        const betSummary = Array.isArray(bs) ? (bs as BetSummaryRow[]) : [];
        const liveBetSummary = Array.isArray(ls) ? (ls as LiveBetSummaryRow[]) : [];

        const totalGgr = sumNumber(betSummary, (row) => row.pl);
        const totalStake = sumNumber(betSummary, (row) => row.stake);
        const totalLiveStake =
          Number(lt?.stake ?? 0) || sumNumber(liveBetSummary, (row) => row.stake);
        const totalLiveBets =
          Number(lt?.totalBets ?? 0) ||
          sumNumber(liveBetSummary, (row) => row.totalBets);

        // /account/getbalance now returns { success, data: { exposure, balanceUp, balanceDown, availableCredit, ... } }
        // BalanceResponse is the inner data object once apiClient unwraps JSON.
        const balanceValue =
          b?.availableCredit ??
          b?.balanceUp ??
          b?.balanceDown ??
          b?.cash ??
          b?.balance ??
          b?.chips ??
          0;
        const exposureValue =
          b?.exposure != null ? b.exposure : totalLiveStake;

        setStats({
          balance: formatCurrency(balanceValue),
          creditLimit: formatCurrency(b?.creditLimit ?? 0),
          givenCredit: formatCurrency(b?.givenCredit ?? 0),
          availableCredit: formatCurrency(b?.availableCredit ?? 0),
          totalMarket: String(m?.totalMarkets ?? 0),
          inplayMarkets: String(m?.inplayMarkets ?? 0),
          players: String(u?.totalUser ?? 0),
          playersLive: String(u?.liveUser ?? 0),
          ggr: formatCurrency(totalGgr),
          exposure: formatCurrency(exposureValue),
          totalStake: formatCurrency(totalStake),
          liveBetStake: formatCurrency(totalLiveStake),
          liveBetCount: String(totalLiveBets),
        });
      } catch {
        /* keep defaults */
      }
    };
    load();
  }, [isAuthenticated]);

  return stats;
}
