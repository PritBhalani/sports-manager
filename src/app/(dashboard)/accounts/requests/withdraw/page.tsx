"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Badge,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components";
import {
  ArrowUpFromLine,
  ArrowUpDown,
  Calendar,
  FileSpreadsheet,
  HandCoins,
} from "lucide-react";
import { getOffPayOut, type OffPayInRecord } from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime, formatUpdateMinusCreateGap, todayRangeUTC } from "@/utils/date";

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Declined", value: "declined" },
];

const TIME_RANGE_OPTIONS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "last7" },
  { label: "Last 30 days", value: "last30" },
];

const fieldClass =
  "h-10 rounded-sm border border-border bg-surface shadow-sm";

export default function RequestWithdrawPage() {
  const pathname = usePathname();
  const [status, setStatus] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [username, setUsername] = useState("");
  const [rows, setRows] = useState<OffPayInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const computeDateRangeISO = (range: string): { fromDate: string; toDate: string } => {
    const now = new Date();
    const utcNowMs = now.getTime();
    const dayMs = 86400000;
    if (range === "today") return todayRangeUTC();
    if (range === "yesterday") {
      const start = new Date(utcNowMs - dayMs);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      return { fromDate: start.toISOString(), toDate: end.toISOString() };
    }
    if (range === "last7") {
      const from = new Date(utcNowMs - 7 * dayMs);
      return { fromDate: from.toISOString(), toDate: now.toISOString() };
    }
    if (range === "last30" || range === "all") {
      const from = new Date(utcNowMs - 30 * dayMs);
      return { fromDate: from.toISOString(), toDate: now.toISOString() };
    }
    const fallback = new Date(utcNowMs - 30 * dayMs);
    return { fromDate: fallback.toISOString(), toDate: now.toISOString() };
  };

  const statusBadgeVariant = (s: number | undefined): "success" | "error" | "warning" | "default" | "info" => {
    if (s === 2) return "error";
    if (s === 3) return "warning";
    if (s === 1) return "info";
    if (s === 4) return "success";
    return "default";
  };

  const fetchWithdrawals = async () => {
    const { fromDate, toDate } = computeDateRangeISO(timeRange);

    setLoading(true);
    setListError(null);

    try {
      const res = await getOffPayOut(
        {
          pageSize: 50,
          groupBy: "",
          page: 1,
          orderBy: "",
          orderByDesc: false,
        },
        {
          status: status === "all" ? "" : status,
          fromDate,
          toDate,
          userId: "",
        },
      );

      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setRows([]);
      setListError(e instanceof Error ? e.message : "Failed to load withdraw requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const onSearch = () => {
    fetchWithdrawals();
  };

  const onExport = () => {
    // TODO: wire to export API
  };

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
      active
        ? "border-primary text-primary"
        : "border-transparent text-muted hover:text-foreground-secondary"
    }`;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Request Withdraw"
        breadcrumbs={["Transactions", "Request"]}
      />

      <Card padded={false} className="overflow-hidden">
        <div className="border-b border-border px-5 pt-5 sm:px-6">
          <div className="flex gap-8">
            <Link href="/accounts/requests/deposit" className={tabClass(false)}>
              <HandCoins className="h-4 w-4 shrink-0" aria-hidden />
              Deposit Request
            </Link>
            <Link
              href="/accounts/requests/withdraw"
              className={tabClass(pathname?.includes("/withdraw") ?? false)}
            >
              <ArrowUpFromLine className="h-4 w-4 shrink-0" aria-hidden />
              Withdraw Request
            </Link>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          <div className="-mx-5 rounded-sm bg-surface-2 px-4 py-4 sm:-mx-6 sm:px-5 sm:py-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                placeholder="Search username, txn/utr code"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={fieldClass}
              />
              <Select
                aria-label="Depositors filter"
                value="allDepositors"
                onChange={() => {}}
                options={[
                  { label: "All Depositors", value: "allDepositors" },
                ]}
                className={fieldClass}
              />
              <Select
                aria-label="Modes filter"
                value="allModes"
                onChange={() => {}}
                options={[{ label: "All Modes", value: "allModes" }]}
                className={fieldClass}
              />
              <Select
                aria-label="Accounts filter"
                value="allAccounts"
                onChange={() => {}}
                options={[{ label: "All Accounts", value: "allAccounts" }]}
                className={fieldClass}
              />
              <Select
                aria-label="Status filter"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={STATUS_OPTIONS}
                className={fieldClass}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  aria-label="Time range"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  options={TIME_RANGE_OPTIONS}
                  className={`${fieldClass} min-w-[140px]`}
                />
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-foreground-tertiary shadow-sm transition-colors hover:bg-surface-muted"
                  aria-label="Open date range"
                >
                  <Calendar className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="rounded-sm px-6"
                  onClick={onSearch}
                >
                  Search
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  className="rounded-sm px-5"
                  leftIcon={<FileSpreadsheet className="h-4 w-4" aria-hidden />}
                  onClick={onExport}
                >
                  Export
                </Button>
              </div>
            </div>
          </div>

          {listError ? (
            <p className="text-sm text-error" role="alert">
              {listError}
            </p>
          ) : null}

          <Table>
            <TableHeader className="bg-surface">
              <TableHead className="font-bold text-foreground-secondary">Name</TableHead>
              <TableHead className="font-bold text-foreground-secondary">Amount</TableHead>
              <TableHead className="font-bold text-foreground-secondary">Bonus</TableHead>
              <TableHead className="font-bold text-foreground-secondary">UTR</TableHead>
              <TableHead className="font-bold text-foreground-secondary">A/C</TableHead>
              <TableHead className="font-bold text-foreground-secondary">Status</TableHead>
              <TableHead className="font-bold text-foreground-secondary">
                <span className="inline-flex items-center gap-1">
                  Created
                  <ArrowUpDown className="h-3.5 w-3.5 text-placeholder" aria-hidden />
                </span>
              </TableHead>
              <TableHead className="min-w-[11rem] font-bold text-foreground-secondary">Updated</TableHead>
              <TableHead className="font-bold text-foreground-secondary">Timer</TableHead>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableEmpty colSpan={9} message="Loading…" />
              ) : rows.length === 0 ? (
                <TableEmpty colSpan={9} message="No transactions yet." />
              ) : (
                rows.map((row) => {
                  const statusLabel =
                    String(row.comment ?? "").trim() ||
                    (row.status != null ? `Status ${row.status}` : "—");
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          href="#"
                          className="font-medium text-primary hover:underline"
                          onClick={(e) => e.preventDefault()}
                        >
                          {row.user?.username ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums text-foreground">
                        {formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell className="tabular-nums text-foreground">
                        {formatCurrency(row.bonusAmount ?? 0)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground">
                        {row.utrNo ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {row.acNo ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusBadgeVariant(row.status)}
                          className="rounded-sm px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
                        >
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground-secondary">
                        {formatDateTime(row.createdOn)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground-secondary">
                        {formatDateTime(row.updatedOn)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-foreground-secondary">
                        {formatUpdateMinusCreateGap(row.createdOn, row.updatedOn)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
