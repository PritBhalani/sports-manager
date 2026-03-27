"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  Tabs,
} from "@/components";
import {
  getUserById,
  getReferralSetting,
  changeBettingLock,
  setCommission,
  updateReferralSetting,
} from "@/services/user.service";
import { getDownlineSummaryDetails } from "@/services/betHistory.service";
import { getUserActivity } from "@/services/betHistory.service";
import { todayRangeUTC, dateRangeToISO } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

function DetailContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [referral, setReferral] = useState<Record<string, unknown> | null>(null);
  const [activity, setActivity] = useState<Record<string, unknown> | null>(null);
  const [summaryDetails, setSummaryDetails] = useState<Record<string, unknown>[]>([]);
  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bettingLock, setBettingLock] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionJson, setCommissionJson] = useState("[]");
  const [applyAll, setApplyAll] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  useEffect(() => {
    if (!userId.trim()) return;
    setLoadError(null);
    setLoading(true);
    Promise.all([
      getUserById(userId.trim()),
      getReferralSetting(userId.trim()).catch(() => null),
      getUserActivity(userId.trim()).catch(() => null),
    ])
      .then(([u, r, a]) => {
        setUser(u ?? null);
        setReferral(r ?? null);
        setActivity(a ?? null);
        setBettingLock(Boolean((u as Record<string, unknown>)?.bettingLock));
      })
      .catch((e) => {
        setUser(null);
        setReferral(null);
        setActivity(null);
        setLoadError(e instanceof Error ? e.message : "Failed to load user details.");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId.trim() || !fromDate || !toDate) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
    getDownlineSummaryDetails(userId.trim(), { fromDate: fromISO, toDate: toISO })
      .then((res) => {
        const list = res?.data ?? [];
        setSummaryDetails(Array.isArray(list) ? list : []);
      })
      .catch(() => setSummaryDetails([]));
  }, [userId, fromDate, toDate]);

  const handleBettingLock = async () => {
    if (!userId.trim()) return;
    setMessage(null);
    try {
      await changeBettingLock({ userId: userId.trim(), bettingLock: !bettingLock });
      setBettingLock(!bettingLock);
      setMessage({ type: "success", text: "Betting lock updated." });
    } catch {
      setMessage({ type: "error", text: "Failed to update betting lock." });
    }
  };

  const handleSetCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;
    setMessage(null);
    let commissions: unknown[] = [];
    try {
      commissions = JSON.parse(commissionJson || "[]");
      if (!Array.isArray(commissions)) commissions = [];
    } catch {
      setMessage({ type: "error", text: "Invalid JSON for commissions." });
      return;
    }
    setCommissionSaving(true);
    try {
      await setCommission({ id: userId.trim(), commissions, applyAll });
      setMessage({ type: "success", text: "Commission updated." });
    } catch {
      setMessage({ type: "error", text: "Failed to update commission." });
    } finally {
      setCommissionSaving(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-w-0">
        <PageHeader title="User Detail" breadcrumbs={["Reports", "Losing Commission"]} />
        <Card>
          <p className="text-sm text-muted">Add ?userId=... to the URL or open from Players list.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="User Detail"
        breadcrumbs={["Reports", "Losing Commission"]}
        description={`User ID: ${userId}`}
      />
      {loadError && (
        <p className="mb-4 text-sm text-error" role="alert">
          {loadError}
        </p>
      )}
      {message && (
        <p
          className={`mb-4 text-sm ${message.type === "success" ? "text-success" : "text-error"}`}
          role="alert"
        >
          {message.text}
        </p>
      )}
      <Tabs
        activeId={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          {
            id: "info",
            label: "Info",
            content: (
              <Card>
                {loading ? (
                  <p className="text-sm text-muted">Loading…</p>
                ) : loadError ? (
                  <p className="text-sm text-error">{loadError}</p>
                ) : user === null ? (
                  <p className="text-sm text-muted">User not found.</p>
                ) : (
                  <div className="space-y-4">
                    <pre className="overflow-auto rounded bg-surface-muted p-4 text-sm">
                      {JSON.stringify(user, null, 2)}
                    </pre>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleBettingLock}
                      >
                        {bettingLock ? "Unlock betting" : "Lock betting"}
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ),
          },
          {
            id: "referral",
            label: "Referral",
            content: (
              <Card>
                {referral === null ? (
                  <p className="text-sm text-muted">No referral settings for this user.</p>
                ) : (
                  <pre className="overflow-auto rounded bg-surface-muted p-4 text-sm">
                    {JSON.stringify(referral, null, 2)}
                  </pre>
                )}
              </Card>
            ),
          },
          {
            id: "activity",
            label: "Activity",
            content: (
              <Card>
                {activity === null ? (
                  <p className="text-sm text-muted">No activity data.</p>
                ) : (
                  <pre className="overflow-auto rounded bg-surface-muted p-4 text-sm">
                    {JSON.stringify(activity, null, 2)}
                  </pre>
                )}
              </Card>
            ),
          },
          {
            id: "commission",
            label: "Commission",
            content: (
              <Card>
                <p className="mb-3 text-sm text-foreground-tertiary">
                  Set commission for this user. Body: id (userId), commissions (JSON array), applyAll.
                </p>
                <form onSubmit={handleSetCommission} className="space-y-4">
                  <label className="block text-sm font-medium text-foreground-secondary">
                    Commissions (JSON array)
                  </label>
                  <textarea
                    value={commissionJson}
                    onChange={(e) => setCommissionJson(e.target.value)}
                    rows={4}
                    className="w-full rounded border border-border-strong px-3 py-2 font-mono text-sm"
                    placeholder='[{"key": "value"}, ...]'
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={applyAll}
                      onChange={(e) => setApplyAll(e.target.checked)}
                      className="rounded border-border-strong"
                    />
                    Apply to all
                  </label>
                  <Button type="submit" variant="primary" disabled={commissionSaving}>
                    {commissionSaving ? "Saving…" : "Set commission"}
                  </Button>
                </form>
              </Card>
            ),
          },
          {
            id: "summary",
            label: "Downline summary details",
            content: (
              <Card>
                <div className="mb-4 flex gap-2">
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="max-w-[140px]"
                  />
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="max-w-[140px]"
                  />
                </div>
                <Table>
                  <TableHeader>
                    <TableHead>Date</TableHead>
                    <TableHead align="right">Stake</TableHead>
                    <TableHead align="right">P&L</TableHead>
                  </TableHeader>
                  <TableBody>
                    {summaryDetails.length === 0 ? (
                      <TableEmpty colSpan={3} message="No data for date range." />
                    ) : (
                      summaryDetails.map((row, i) => (
                        <TableRow key={String(row.id ?? row.date ?? i)}>
                          <TableCell>{String(row.date ?? row.createdAt ?? "—")}</TableCell>
                          <TableCell align="right">{formatCurrency(row.stake)}</TableCell>
                          <TableCell align="right">{formatCurrency(row.pl ?? row.profitLoss)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}

export default function PlayerDetailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading…</div>}>
      <DetailContent />
    </Suspense>
  );
}
