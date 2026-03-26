"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
} from "@/components";
import {
  Download,
  Filter,
  Eye,
  GitBranch,
  LockOpen,
  Landmark,
  Code2,
  Percent,
  Settings,
} from "lucide-react";
import { getDownline } from "@/services/account.service";
import { getSessionMemberId } from "@/services/user.service";
import { formatDateTime } from "@/utils/date";
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

function formatUiNumber(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("en-IN");
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
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border-transparent bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Create
            </Link>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No players yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableHead className="font-bold text-zinc-700">Username</TableHead>
                  <TableHead className="font-bold text-zinc-700">Downline</TableHead>
                  <TableHead className="font-bold text-zinc-700">Betting Status</TableHead>
                  <TableHead className="font-bold text-zinc-700">Status</TableHead>
                  <TableHead className="font-bold text-zinc-700">Details</TableHead>
                  <TableHead className="font-bold text-zinc-700">Net Exposure</TableHead>
                  <TableHead className="font-bold text-zinc-700">Take</TableHead>
                  <TableHead className="font-bold text-zinc-700">Give</TableHead>
                  <TableHead className="font-bold text-zinc-700">Balance</TableHead>
                  <TableHead className="font-bold text-zinc-700">Credit Limit</TableHead>
                  <TableHead className="font-bold text-zinc-700">Available Credit</TableHead>
                  <TableHead className="font-bold text-zinc-700">Actions</TableHead>
                  <TableHead className="font-bold text-zinc-700">Created</TableHead>
                  <TableHead className="font-bold text-zinc-700">Last Login</TableHead>
                  <TableHead className="font-bold text-zinc-700">Last IP</TableHead>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const id = String(row.id ?? "");
                    const uname = String(row.username ?? "—");
                    const { text: statusText, active: statusActive } = rowStatusLabel(row.status);
                    const bal = row.balanceInfo as Record<string, unknown> | undefined;
                    const bettingStatus = String(row.bettingStatus ?? row.betStatus ?? "—");
                    const exposure = Number(
                      bal?.exposure ?? row.exposure ?? row.netExposure ?? 0,
                    );
                    const take = Number(bal?.take ?? row.take ?? 0);
                    const give = Number(bal?.give ?? row.give ?? 0);
                    const balance = Number(bal?.balance ?? row.balance ?? 0);
                    const creditLimit = Number(
                      bal?.creditLimit ?? row.creditLimit ?? 0,
                    );
                    const availableCredit = Number(
                      bal?.availableCredit ?? row.availableCredit ?? 0,
                    );
                    const lastIp = String(row.remoteIp ?? row.ip ?? row.lastIp ?? "—");
                    const mobile = String(row.mobile ?? "");

                    return (
                      <TableRow key={id || uname}>
                        <TableCell className="font-medium text-zinc-900">
                          <div>{uname}</div>
                          <div className="text-xs text-zinc-500">
                            {mobile ? `(${mobile})` : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <GitBranch className="h-4 w-4 text-zinc-500" aria-hidden />
                        </TableCell>
                        <TableCell>
                          <LockOpen className="h-4 w-4 text-zinc-500" aria-hidden />
                        </TableCell>
                        <TableCell className={statusActive ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                          {statusText}
                        </TableCell>
                        <TableCell>
                          {id ? (
                            <Link href={`/players/${id}`} className="text-blue-600 hover:underline">
                              <Eye className="h-4 w-4" aria-hidden />
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums font-semibold text-emerald-600">{formatUiNumber(exposure)}</TableCell>
                        <TableCell className="tabular-nums font-semibold text-emerald-600">{formatUiNumber(take)}</TableCell>
                        <TableCell className="tabular-nums font-semibold text-red-600">{formatUiNumber(give)}</TableCell>
                        <TableCell className="tabular-nums font-semibold text-zinc-900">{formatUiNumber(balance)}</TableCell>
                        <TableCell className="tabular-nums font-semibold text-zinc-900">{formatUiNumber(creditLimit)}</TableCell>
                        <TableCell className="tabular-nums font-semibold text-zinc-900">{formatUiNumber(availableCredit)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-blue-600">
                            <Landmark className="h-4 w-4" aria-hidden />
                            <Code2 className="h-4 w-4" aria-hidden />
                            <Percent className="h-4 w-4" aria-hidden />
                            <Settings className="h-4 w-4" aria-hidden />
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-zinc-700">
                          {formatDateTime(row.createdOn)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-zinc-700">
                          {formatDateTime(row.lastLogin)}
                        </TableCell>
                        <TableCell className="text-zinc-700">{lastIp}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
