"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  PageHeader,
  Card,
  Tabs,
} from "@/components";
import { getUserActivity } from "@/services/betHistory.service";
import { getInOutActivity, getCasinoActivity } from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";

const PLAYER_DETAIL_TABS = [
  { id: "activity", label: "Activity" },
  { id: "bet-list", label: "Bet List" },
  { id: "betting-pl", label: "Betting P&L" },
  { id: "fd-betting-pl", label: "FD Betting P&L" },
  { id: "account-statement", label: "Account Statement" },
  { id: "bonus-statement", label: "Bonus Statement" },
  { id: "referral-statement", label: "Referral Statement" },
  { id: "transfer-statement", label: "Transfer Statement" },
  { id: "login-history", label: "Login History" },
] as const;

type TabId = (typeof PLAYER_DETAIL_TABS)[number]["id"];
type RangeKey = "day1" | "day3" | "day7" | "day30" | "lifetime";
type Metric = Record<RangeKey, number>;

const EMPTY_METRIC: Metric = {
  day1: 0,
  day3: 0,
  day7: 0,
  day30: 0,
  lifetime: 0,
};

function toMetric(raw: unknown): Metric {
  const src = (raw ?? {}) as Partial<Record<RangeKey, unknown>>;
  return {
    day1: Number(src.day1 ?? 0),
    day3: Number(src.day3 ?? 0),
    day7: Number(src.day7 ?? 0),
    day30: Number(src.day30 ?? 0),
    lifetime: Number(src.lifetime ?? 0),
  };
}

function metricFromPath(
  source: unknown,
  ...path: string[]
): Metric {
  let cur: unknown = source;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return EMPTY_METRIC;
    cur = (cur as Record<string, unknown>)[key];
  }
  return toMetric(cur);
}

type ActivityRows = {
  win: Metric;
  commission: Metric;
  pnl: Metric;
  turnover: Metric;
  deposit: Metric;
  withdrawal: Metric;
  casino: Metric;
};

function renderMetricValue(metric: Metric, key: RangeKey): string {
  return formatCurrency(metric[key]);
}

export default function PlayerDetailPage() {
  const params = useParams<{ playerId: string }>();
  const playerId = String(params?.playerId ?? "").trim();
  const [activeTab, setActiveTab] = useState<TabId>("activity");
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityRows, setActivityRows] = useState<ActivityRows>({
    win: EMPTY_METRIC,
    commission: EMPTY_METRIC,
    pnl: EMPTY_METRIC,
    turnover: EMPTY_METRIC,
    deposit: EMPTY_METRIC,
    withdrawal: EMPTY_METRIC,
    casino: EMPTY_METRIC,
  });
  const [betDateFrom, setBetDateFrom] = useState("");
  const [betDateTo, setBetDateTo] = useState("");
  const [betPeriod, setBetPeriod] = useState<"current" | "past">("current");
  const [betMatchType, setBetMatchType] = useState<"matched" | "unmatched">("matched");
  const [referralUse, setReferralUse] = useState("get-referral-use");

  useEffect(() => {
    if (!playerId || activeTab !== "activity") return;
    let cancelled = false;
    setLoadingActivity(true);
    setActivityError(null);

    Promise.all([
      getUserActivity(playerId),
      getInOutActivity(playerId),
      getCasinoActivity(playerId),
    ])
      .then(([betActivity, inOutActivity, casinoActivity]) => {
        if (cancelled) return;
        setActivityRows({
          win: metricFromPath(betActivity, "data", "user", "win"),
          commission: metricFromPath(betActivity, "data", "user", "commission"),
          pnl: metricFromPath(betActivity, "data", "user", "pnl"),
          turnover: metricFromPath(betActivity, "data", "user", "to"),
          deposit: metricFromPath(inOutActivity, "data", "user", "totalDeposit"),
          withdrawal: metricFromPath(inOutActivity, "data", "user", "totalWithdrawal"),
          casino: metricFromPath(casinoActivity, "data", "user", "pnl"),
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setActivityError(
          e instanceof Error ? e.message : "Failed to load activity.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingActivity(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerId, activeTab]);

  const tabs = useMemo(
    () =>
      PLAYER_DETAIL_TABS.map((tab) => {
        if (tab.id !== "activity") {
          if (tab.id === "bet-list") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <button
                      type="button"
                      className="inline-flex h-9 items-center justify-center rounded-sm border border-border bg-surface px-3 text-sm font-medium text-foreground-secondary hover:bg-surface-2"
                    >
                      Filter
                    </button>
                  </div>

                  <p className="text-sm text-muted">There is no data for selected filters.</p>

                  <div className="border-b border-border">
                    <nav className="-mb-px flex items-center gap-5" aria-label="Bet period">
                      <button
                        type="button"
                        onClick={() => setBetPeriod("current")}
                        className={`border-b-2 px-0.5 py-2 text-sm font-medium transition-colors ${
                          betPeriod === "current"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted hover:border-border-strong hover:text-foreground-secondary"
                        }`}
                        aria-pressed={betPeriod === "current"}
                      >
                        Current
                      </button>
                      <button
                        type="button"
                        onClick={() => setBetPeriod("past")}
                        className={`border-b-2 px-0.5 py-2 text-sm font-medium transition-colors ${
                          betPeriod === "past"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted hover:border-border-strong hover:text-foreground-secondary"
                        }`}
                        aria-pressed={betPeriod === "past"}
                      >
                        Past
                      </button>
                    </nav>
                  </div>

                  <div className="flex flex-wrap items-center gap-5">
                    <label className="inline-flex items-center gap-2 text-sm text-foreground-secondary">
                      <input
                        type="radio"
                        name="bet-match-type"
                        checked={betMatchType === "matched"}
                        onChange={() => setBetMatchType("matched")}
                        className="h-4 w-4 border-border-strong"
                      />
                      Matched
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-foreground-secondary">
                      <input
                        type="radio"
                        name="bet-match-type"
                        checked={betMatchType === "unmatched"}
                        onChange={() => setBetMatchType("unmatched")}
                        className="h-4 w-4 border-border-strong"
                      />
                      UnMatched
                    </label>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[920px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">IP Address</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Odds</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Stake</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Liability</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Potential Profit</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Placed</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Matched</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={9} className="px-4 py-6 text-center text-sm text-muted">
                            No records found for selected filter and time period.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            };
          }
          if (tab.id === "betting-pl") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[820px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Market Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Winner
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Start time
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Settled Time
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Comm.
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Net Win
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                            No records found for selected filter and time period.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            };
          }
          if (tab.id === "fd-betting-pl") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                  </div>

                  <p className="text-sm text-foreground-secondary">0 Row found</p>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[760px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Round Id
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Game Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Provider
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            P&L
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            SettelTime
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                            No records found for selected filter and time period.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            };
          }
          if (tab.id === "account-statement") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                  </div>

                  <p className="text-sm text-foreground-secondary">
                    There is no data for this date range. Please select another date range.
                  </p>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[760px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Description
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            P&L
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Credit Limit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Balance
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                            No records found for selected filter and time period.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            };
          }
          if (tab.id === "bonus-statement") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={betDateFrom}
                      onChange={(e) => setBetDateFrom(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                    <span className="text-sm text-muted">to</span>
                    <input
                      type="date"
                      value={betDateTo}
                      onChange={(e) => setBetDateTo(e.target.value)}
                      className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                    />
                  </div>

                  <p className="text-sm text-foreground-secondary">0 Row found</p>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="min-w-[980px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface-muted/70">
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Code
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Bonus Amount
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Required Turnover to Activate
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Required Turnover to Withdraw
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Bonus Date
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Bonus Expiry
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                            Is Expired
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted">
                            No records found for selected filter and time period.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
            };
          }
          if (tab.id === "referral-statement") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={betDateFrom}
                        onChange={(e) => setBetDateFrom(e.target.value)}
                        className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                      />
                      <span className="text-sm text-muted">to</span>
                      <input
                        type="date"
                        value={betDateTo}
                        onChange={(e) => setBetDateTo(e.target.value)}
                        className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                      />
                      <select
                        value={referralUse}
                        onChange={(e) => setReferralUse(e.target.value)}
                        className="h-9 rounded-sm border border-border bg-surface px-3 text-sm text-foreground"
                      >
                        <option value="get-referral-use">Get Referral Use</option>
                      </select>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-sm border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                      >
                        Search
                      </button>
                    </div>
                    <p className="text-sm font-medium text-foreground-secondary">
                      Referral Balance :
                    </p>
                  </div>

                  <div className="rounded-lg border border-border bg-surface">
                    <div className="px-4 py-6 text-center text-sm text-muted">
                      No Records Found.
                    </div>
                  </div>
                </div>
              ),
            };
          }
          if (tab.id === "transfer-statement") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="rounded-lg border border-border bg-surface">
                  <p className="px-4 py-6 text-sm text-foreground-secondary">
                    There have been no transfers in the last 180 days.
                  </p>
                </div>
              ),
            };
          }
          if (tab.id === "login-history") {
            return {
              id: tab.id,
              label: tab.label,
              content: (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-[880px] w-full border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted/70">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                          Login Date & Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                          Logout Date & Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                          IP Address
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                          ISP
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">
                          City,State,Country
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                          No records found.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ),
            };
          }
          const _unreachable: never = tab;
          return _unreachable;
        }

        return {
          id: tab.id,
          label: tab.label,
          content: (
            <div className="space-y-3">
              {activityError ? (
                <p className="text-sm text-error" role="alert">
                  {activityError}
                </p>
              ) : null}
              {loadingActivity ? (
                <p className="text-sm text-muted">Loading activity...</p>
              ) : null}
              <div className="overflow-x-auto rounded-lg border border-border bg-surface">
                <table className="min-w-[760px] w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/70">
                      <th className="w-[160px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground-tertiary"> </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Today</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">3 days</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">7 days</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">30 days</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground-tertiary">Lifetime</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Win</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.win, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.win, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.win, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.win, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.win, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Comm</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.commission, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.commission, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.commission, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.commission, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.commission, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">P&L</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.pnl, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.pnl, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.pnl, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.pnl, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.pnl, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Turnover</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.turnover, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.turnover, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.turnover, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.turnover, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.turnover, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface-muted/35">
                      <td colSpan={6} className="h-3 px-0 py-0" />
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Deposit</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.deposit, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.deposit, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.deposit, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.deposit, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.deposit, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Withdrawal</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.withdrawal, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.withdrawal, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.withdrawal, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.withdrawal, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.withdrawal, "lifetime")}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">D-W</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{formatCurrency(activityRows.deposit.day1 - activityRows.withdrawal.day1)}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{formatCurrency(activityRows.deposit.day3 - activityRows.withdrawal.day3)}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{formatCurrency(activityRows.deposit.day7 - activityRows.withdrawal.day7)}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{formatCurrency(activityRows.deposit.day30 - activityRows.withdrawal.day30)}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{formatCurrency(activityRows.deposit.lifetime - activityRows.withdrawal.lifetime)}</td>
                    </tr>
                    <tr className="border-b border-border bg-surface-muted/35">
                      <td colSpan={6} className="h-3 px-0 py-0" />
                    </tr>
                    <tr className="bg-surface">
                      <td className="px-4 py-3 text-sm font-semibold text-foreground">Casino</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.casino, "day1")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.casino, "day3")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.casino, "day7")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.casino, "day30")}</td>
                      <td className="px-4 py-3 text-center text-sm text-foreground-secondary">{renderMetricValue(activityRows.casino, "lifetime")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ),
        };
      }),
    [
      activityError,
      loadingActivity,
      activityRows,
      betDateFrom,
      betDateTo,
      betPeriod,
      betMatchType,
      referralUse,
    ],
  );

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader title="Player Detail" breadcrumbs={["Players", "Detail"]} />
      <Card padded={false}>
        <div className="px-4 pb-4 pt-2 sm:px-6 sm:pb-6 sm:pt-3">
          <Tabs
            activeId={activeTab}
            onTabChange={(id) => setActiveTab(id as TabId)}
            tabs={tabs}
          />
        </div>
      </Card>
    </div>
  );
}

