"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader, Card, Button, Input, Select, TablePagination } from "@/components";
import { Download, Filter } from "lucide-react";
import { getDownline } from "@/services/account.service";
import { getSessionMemberId } from "@/services/user.service";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import type { DownlineRecord } from "@/types/account.types";

/** Map UI filter to API `searchQuery.status` (empty = no filter / all). */
function statusForPlayerType(playerType: string): string {
  if (playerType === "inactive") return "-1";
  if (playerType === "active") return "2";
  return "";
}

function rowStatusLabel(status: unknown): { text: string; active: boolean } {
  const n = typeof status === "number" ? status : Number(status);
  if (n === 2 || n === 1) return { text: "ACTIVE", active: true };
  if (n === -1 || Number.isNaN(n)) return { text: "INACTIVE", active: false };
  return { text: String(status ?? "—"), active: false };
}

export default function PlayersPage() {
  const [username, setUsername] = useState("");
  const [userCode, setUserCode] = useState("");
  const [playerType, setPlayerType] = useState("all");
  const [rows, setRows] = useState<DownlineRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDownline = useCallback(() => {
    const scopeId = getSessionMemberId();
    if (!scopeId) {
      setError("Log in to load downline players.");
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    getDownline(
      {
        page,
        pageSize,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      {
        userCode: userCode.trim(),
        username: username.trim(),
        status: statusForPlayerType(playerType),
        userId: null,
      },
      scopeId,
    )
      .then((res) => {
        setRows(Array.isArray(res.data) ? res.data : []);
        setTotal(typeof res.total === "number" ? res.total : 0);
      })
      .catch((e) => {
        setRows([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load players.");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, username, userCode, playerType]);

  useEffect(() => {
    loadDownline();
  }, [loadDownline]);

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <PageHeader title="Players" breadcrumbs={["Players"]} />

      <Card>
        {error && (
          <p className="mb-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Filters row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => {
              setPage(1);
              setUsername(e.target.value);
            }}
            className="h-10"
          />
          <Select
            aria-label="Player type"
            value={playerType}
            onChange={(e) => {
              setPage(1);
              setPlayerType(e.target.value);
            }}
            options={[
              { label: "All Players", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
            className="h-10"
          />
          <Input
            placeholder="User code"
            value={userCode}
            onChange={(e) => {
              setPage(1);
              setUserCode(e.target.value);
            }}
            className="h-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-5 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Filter className="h-4 w-4" aria-hidden />}
              onClick={() => {
                setPage(1);
                loadDownline();
              }}
            >
              Apply filters
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Download className="h-4 w-4" aria-hidden />}
            >
              Export
            </Button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
            <Button type="button" variant="outline" size="sm">
              KYC
            </Button>
            <Link
              href="/players/add"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border-transparent bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="hidden bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500 sm:grid sm:grid-cols-8 sm:px-5">
            <span className="col-span-2">Names/Username</span>
            <span>User code</span>
            <span>Status</span>
            <span>Wallets</span>
            <span>Mobile</span>
            <span>Last login</span>
            <span>Registered</span>
          </div>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No players yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {rows.map((row) => {
                const id = String(row.id ?? "");
                const uname = String(row.username ?? "—");
                const code = String(row.userCode ?? "—");
                const { text: statusText, active: statusActive } = rowStatusLabel(row.status);
                const bal = row.balanceInfo as Record<string, unknown> | undefined;
                const cash = typeof bal?.balance === "number" ? bal.balance : Number(bal?.balance ?? 0);
                const credit =
                  typeof bal?.availableCredit === "number"
                    ? bal.availableCredit
                    : Number(bal?.availableCredit ?? 0);
                const mobile = String(row.mobile ?? "—");
                return (
                  <div
                    key={id || uname}
                    className="px-4 py-4 text-sm text-zinc-800 sm:grid sm:grid-cols-8 sm:items-center sm:gap-3 sm:px-5"
                  >
                    <div className="col-span-2 space-y-1">
                      <div className="font-medium text-zinc-900">{uname}</div>
                      {code !== "—" ? (
                        <button
                          type="button"
                          className="text-left text-xs font-medium text-blue-600 hover:underline"
                        >
                          {code}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </div>
                    <div className="hidden text-sm text-zinc-700 sm:block">{code}</div>
                    <div className="mt-1 sm:mt-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          statusActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {statusText}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-2 text-xs text-zinc-700 sm:mt-0 sm:flex-row sm:flex-wrap sm:items-center">
                      <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5">
                        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Balance
                        </span>
                        <span className="tabular-nums">{formatCurrency(cash)}</span>
                      </span>
                      <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5">
                        <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          Avail.
                        </span>
                        <span className="tabular-nums">{formatCurrency(credit)}</span>
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-600 sm:mt-0">{mobile}</div>
                    <div className="mt-2 text-xs text-zinc-700 sm:mt-0">
                      {formatDateTime(row.lastLogin)}
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-zinc-700 sm:mt-0">
                      {formatDateTime(row.createdOn)}
                      <div className="text-[11px] leading-relaxed text-zinc-400">signup</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <TablePagination
            page={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPage(1);
              setPageSize(size);
            }}
            pageSizeOptions={[15, 30, 50, 100, 200]}
          />
        </div>
      </Card>
    </div>
  );
}
