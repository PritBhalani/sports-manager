"use client";

import { useState, useEffect } from "react";
import {
  getTotalMarket,
  getUserSummary,
  getLiveBetTotal,
  getBetSummary,
  getLiveBetSummary,
} from "@/services/dashboard.service";
import { getBalance } from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";

export type DashboardStats = {
  balance: string;
  totalMarket: string;
  players: string;
  playersNew: string;
  playersUnique: string;
  deposits: string;
  withdraws: string;
  ggr: string;
  ngr: string;
  exposure: string;
  liveBetTotal: string;
};

const initialStats: DashboardStats = {
  balance: "0",
  totalMarket: "0",
  players: "0",
  playersNew: "0",
  playersUnique: "0",
  deposits: "0",
  withdraws: "0",
  ggr: "0",
  ngr: "0",
  exposure: "0",
  liveBetTotal: "0",
};

export function useDashboardStats(): DashboardStats {
  const [stats, setStats] = useState<DashboardStats>(initialStats);

  useEffect(() => {
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
        const bs = betSum.status === "fulfilled" ? betSum.value : null;
        const ls = liveSum.status === "fulfilled" ? liveSum.value : null;
        setStats({
          balance: formatCurrency(b?.balance ?? b?.chips ?? b?.cash),
          totalMarket: String(m?.total ?? 0),
          players: String(u?.players ?? u?.totalUsers ?? 0),
          playersNew: String(u?.newPlayers ?? 0),
          playersUnique: String(u?.uniquePlayers ?? 0),
          deposits: formatCurrency(u?.deposits ?? bs?.deposits),
          withdraws: formatCurrency(u?.withdraws ?? bs?.withdraws),
          ggr: formatCurrency(u?.ggr ?? bs?.ggr),
          ngr: formatCurrency(u?.ngr ?? bs?.ngr),
          exposure: formatCurrency(u?.exposure),
          liveBetTotal: String(lt?.total ?? ls?.total ?? 0),
        });
      } catch {
        /* keep defaults */
      }
    };
    load();
  }, []);

  return stats;
}
