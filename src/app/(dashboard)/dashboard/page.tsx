"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { StatsCard } from "@/components";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const STATS_CONFIG = (
  s: ReturnType<typeof useDashboardStats>
): { title: string; value: string; subStats: { label: string; value: string }[] }[] => [
  { title: "Current Cashable Balance", value: s.balance, subStats: [] },
  {
    title: "Credit",
    value: s.availableCredit,
    subStats: [
      { label: "Limit", value: s.creditLimit },
      { label: "Used", value: s.givenCredit },
      { label: "Available", value: s.availableCredit },
    ],
  },
  {
    title: "GGR",
    value: s.ggr,
    subStats: [{ label: "Stake", value: s.totalStake }],
  },
  {
    title: "Player Sports Exposure",
    value: s.exposure,
    subStats: [{ label: "Live Bets", value: s.liveBetCount }],
  },
  {
    title: "Players",
    value: s.players,
    subStats: [
      { label: "Live", value: s.playersLive },
    ],
  },
  {
    title: "Markets",
    value: s.totalMarket,
    subStats: [{ label: "In-Play", value: s.inplayMarkets }],
  },
  {
    title: "Live Bet Stake",
    value: s.liveBetStake,
    subStats: [{ label: "Total Bets", value: s.liveBetCount }],
  },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"details" | "visual">("details");
  const [period, setPeriod] = useState("Today");
  const stats = useDashboardStats();
  const statList = STATS_CONFIG(stats);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">
            Welcome Back, Sports Manager#1
          </h1>
          <p className="mt-0.5 text-sm text-muted">Dashboard</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex rounded-sm border border-border bg-surface p-0.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "details"}
              onClick={() => setActiveTab("details")}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "details"
                  ? "bg-sidebar-bg text-white"
                  : "text-foreground-tertiary hover:bg-surface-2"
              }`}
            >
              Details
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "visual"}
              onClick={() => setActiveTab("visual")}
              className={`rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === "visual"
                  ? "bg-sidebar-bg text-white"
                  : "text-foreground-tertiary hover:bg-surface-2"
              }`}
            >
              Visual
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2">
            <Calendar className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-sm font-medium text-foreground focus:outline-none"
              aria-label="Report period"
            >
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="Last 7 days">Last 7 days</option>
              <option value="Last 30 days">Last 30 days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {statList.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            subStats={stat.subStats}
          />
        ))}
      </div>
    </div>
  );
}
