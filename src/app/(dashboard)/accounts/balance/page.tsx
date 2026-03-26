"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, FilterBar, Input, Button } from "@/components";
import { Search } from "lucide-react";
import StatsCard from "@/components/cards/StatsCard";
import { getBalance, getBalanceDetail } from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { getAuthSession } from "@/store/authStore";
import type { LoginResponse } from "@/types/auth.types";

export default function BalancePage() {
  const [balance, setBalance] = useState<{ balance?: number; chips?: number; cash?: number } | null>(null);
  const [detailUserId, setDetailUserId] = useState("");
  const [detailBalance, setDetailBalance] = useState<typeof balance>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  // Important: don't read localStorage-backed session during initial render.
  // Otherwise server renders "—" and client immediately updates to "INR",
  // causing a hydration mismatch.
  const [currency, setCurrency] = useState<LoginResponse["currency"] | undefined>(undefined);

  useEffect(() => {
    setCurrency(getAuthSession().currency);
  }, []);

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
        breadcrumbs={["Website", "Currency"]}
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

      <Card title="Currency info" className="mt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-sm border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Currency
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {currency?.code ?? currency?.name ?? "—"}
            </p>
            {currency?.name &&
              currency?.code &&
              currency.name !== currency.code && (
                <p className="mt-1 text-xs text-zinc-600">{currency.name}</p>
              )}
          </div>

          <div className="rounded-sm border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Rate
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {typeof currency?.rate === "number" && currency.rate !== 0
                ? formatCurrency(currency.rate)
                : "—"}
            </p>
          </div>

          <div className="rounded-sm border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Fractional
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {typeof (currency as any)?.fractional === "number" &&
              (currency as any).fractional !== 0
                ? String((currency as any).fractional)
                : "—"}
            </p>
          </div>

          <div className="rounded-sm border border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Primary
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">
              {(currency as any)?.isPrimary ? "Yes" : "—"}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm text-zinc-600">
          Currency object shown is from the login response (<code className="rounded bg-zinc-100 px-1 text-xs">POST /authenticate/login</code>).
        </p>
      </Card>
    </div>
  );
}
