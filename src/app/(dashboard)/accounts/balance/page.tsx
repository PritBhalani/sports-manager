"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, FilterBar, Input, Button } from "@/components";
import { Search } from "lucide-react";
import StatsCard from "@/components/cards/StatsCard";
import { getBalance, getBalanceDetail } from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";

export default function BalancePage() {
  const [balance, setBalance] = useState<{ balance?: number; chips?: number; cash?: number } | null>(null);
  const [detailUserId, setDetailUserId] = useState("");
  const [detailBalance, setDetailBalance] = useState<typeof balance>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBalance()
      .then((res) => {
        if (!cancelled) setBalance(res ?? null);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLookup = () => {
    if (!detailUserId.trim()) return;
    setDetailLoading(true);
    getBalanceDetail(detailUserId.trim())
      .then((res) => setDetailBalance(res ?? null))
      .catch(() => setDetailBalance(null))
      .finally(() => setDetailLoading(false));
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Balance"
        breadcrumbs={["Accounts", "Balance"]}
      />

      <FilterBar className="mb-4">
        <Input
          placeholder="User ID (for detail)"
          value={detailUserId}
          onChange={(e) => setDetailUserId(e.target.value)}
          className="max-w-[200px]"
        />
        <Button
          variant="primary"
          leftIcon={<Search className="h-4 w-4" />}
          onClick={handleLookup}
          disabled={detailLoading || !detailUserId.trim()}
        >
          {detailLoading ? "Loading…" : "Lookup"}
        </Button>
      </FilterBar>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Current balance (you)"
          value={loading ? "…" : formatCurrency(balance?.balance ?? balance?.chips ?? balance?.cash ?? 0)}
        />
        {detailUserId.trim() && (
          <StatsCard
            title={`Balance for user: ${detailUserId}`}
            value={
              detailLoading
                ? "…"
                : formatCurrency(
                    detailBalance?.balance ?? detailBalance?.chips ?? detailBalance?.cash ?? 0
                  )
            }
          />
        )}
      </div>

      <Card title="Balance info" className="mt-4">
        <p className="text-sm text-zinc-600">
          Use the lookup to check balance for a specific user. Main card shows the authenticated user’s balance from{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">GET /account/getbalance</code>.
        </p>
      </Card>
    </div>
  );
}
