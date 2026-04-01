"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  ListPageFrame,
  ListRequestFiltersGrid,
  ListTableSection,
  Badge,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components";
import { ArrowUpFromLine, HandCoins } from "lucide-react";
import {
  getOffPayIn,
  rollbackOffPayIn,
  updateOffPayIn,
  type OffPayInRecord,
} from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { dateRangeToISO, formatDateTime } from "@/utils/date";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Init", value: "1" },
  { label: "Confirm", value: "2" },
  { label: "Cancel", value: "3" },
  { label: "Expired", value: "4" },
];

function initialDepositDateRange(): { from: string; to: string } {
  const now = new Date();
  const toStr = now.toISOString().slice(0, 10);
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
  const fromStr = from.toISOString().slice(0, 10);
  return { from: fromStr, to: toStr };
}

const TAB_DEPOSIT = "/transactions/requests/deposit";
const TAB_WITHDRAW = "/transactions/requests/withdraw";

export default function TransactionsRequestDepositPage() {
  const pathname = usePathname();
  const isWithdrawTab = pathname?.includes("/withdraw") ?? false;

  const seededRange = useMemo(() => initialDepositDateRange(), []);
  const [status, setStatus] = useState("");
  const [username, setUsername] = useState("");
  const [fromDate, setFromDate] = useState(seededRange.from);
  const [toDate, setToDate] = useState(seededRange.to);
  /** Values last applied via Search — used for pagination without refetching on every keystroke. */
  const appliedStatusRef = useRef("");
  const appliedUsernameRef = useRef("");
  const appliedFromDateRef = useRef(seededRange.from);
  const appliedToDateRef = useRef(seededRange.to);

  const [rows, setRows] = useState<OffPayInRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** `"${id}-update"` | `"${id}-rollback"` while request in flight */
  const [rowActionKey, setRowActionKey] = useState<string | null>(null);

  type DepositUiStatus = "Init" | "Confirm" | "Cancel" | "Expired";

  /**
   * API sends `status` on the pay-in row; `comment` disambiguates (e.g. both use status 2 for
   * "Payment Received" vs "Payment Not Received"). `user.status` is the member account, not this flow.
   */
  const depositRowStatus = (row: OffPayInRecord): DepositUiStatus | string => {
    const comment = String(row.comment ?? "").trim();
    const lo = comment.toLowerCase();

    if (lo.includes("payment received")) return "Confirm";
    if (lo.includes("payment not received")) return "Cancel";
    if (lo.includes("rollback")) return "Cancel";
    if (lo.includes("expired") || lo.includes("expire")) return "Expired";

    const n = row.status;
    if (n === 1) return "Init";
    if (n === 4) return "Expired";
    if (n === 3) return "Cancel";
    if (n === 2) return "Confirm";

    if (comment) {
      if (lo === "init" || lo === "pending") return "Init";
      if (lo === "confirm" || lo === "confirmed" || lo === "approved") return "Confirm";
      if (lo === "cancel" || lo === "cancelled" || lo === "declined") return "Cancel";
      return comment;
    }
    return "—";
  };

  const statusBadgeVariantForDeposit = (
    resolved: DepositUiStatus | string,
  ): "success" | "error" | "warning" | "default" | "info" => {
    if (resolved === "Confirm") return "success";
    if (resolved === "Cancel") return "error";
    if (resolved === "Expired") return "warning";
    if (resolved === "Init") return "info";
    return "default";
  };

  const depositRowActionVisibility = (row: OffPayInRecord) => {
    const resolved = depositRowStatus(row);
    const comment = String(row.comment ?? "").toLowerCase();
    const isRollbackOutcome = comment.includes("rollback");

    const showUpdate = resolved === "Init";
    const showRollback =
      !isRollbackOutcome &&
      (resolved === "Confirm" ||
        resolved === "Cancel" ||
        resolved === "Expired");

    return { showUpdate, showRollback };
  };

  const handleRowUpdate = async (id: string) => {
    setRowActionKey(`${id}-update`);
    try {
      await updateOffPayIn({ id });
      await load();
    } finally {
      setRowActionKey(null);
    }
  };

  const handleRowRollback = async (id: string) => {
    setRowActionKey(`${id}-rollback`);
    try {
      await rollbackOffPayIn({ id });
      await load();
    } finally {
      setRowActionKey(null);
    }
  };

  const formatTimer = (createdOn?: string) => {
    if (!createdOn) return "—";
    const created = new Date(createdOn);
    if (Number.isNaN(created.getTime())) return "—";
    const diffMs = Math.max(0, Date.now() - created.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const load = useCallback(
    async (overridePage?: number) => {
      const effectivePage = overridePage ?? page;
      const fromStr = appliedFromDateRef.current;
      const toStr = appliedToDateRef.current;
      if (!fromStr || !toStr) return;
      const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromStr, toStr);
      setLoading(true);
      setError(null);
      try {
        const res = await getOffPayIn(
          {
            pageSize,
            groupBy: "",
            page: effectivePage,
            orderBy: "",
            orderByDesc: false,
          },
          {
            status: appliedStatusRef.current,
            fromDate: fromISO,
            toDate: toISO,
            userId: appliedUsernameRef.current.trim(),
          },
        );
        setRows(Array.isArray(res.data) ? res.data : []);
        setTotalItems(
          typeof res.total === "number" ? res.total : Array.isArray(res.data) ? res.data.length : 0,
        );
      } catch (e) {
        setRows([]);
        setTotalItems(0);
        setError(e instanceof Error ? e.message : "Failed to load deposit requests.");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader title="Request Deposit" breadcrumbs={["Transactions", "Requests", "Deposit"]} />

      <ListPageFrame>
        <div
          className="flex justify-start rounded-t-lg bg-white sm:w-full sm:justify-center"
          role="tablist"
          aria-orientation="horizontal"
        >
          <Link
            href={TAB_DEPOSIT}
            className={`flex-1 flex items-center justify-center gap-2 ${
              !isWithdrawTab ? "text-primary border-primary" : "text-muted border-transparent"
            } border-b-2 px-6 py-3`}
            aria-selected={!isWithdrawTab}
          >
            <HandCoins className="h-4 w-4" aria-hidden />
            Deposit Request
          </Link>
          <Link
            href={TAB_WITHDRAW}
            className={`flex-1 flex items-center justify-center gap-2 ${
              isWithdrawTab ? "text-primary border-primary" : "text-muted border-transparent"
            } border-b-2 px-6 py-3`}
            aria-selected={isWithdrawTab}
          >
            <ArrowUpFromLine className="h-4 w-4" aria-hidden />
            Withdraw Request
          </Link>
        </div>

        <div className="flex w-full flex-col justify-center gap-0">
          <ListRequestFiltersGrid
            variant="simple"
            username={username}
            onUsernameChange={setUsername}
            status={status}
            onStatusChange={setStatus}
            statusOptions={STATUS_OPTIONS}
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onSearch={() => {
              appliedStatusRef.current = status;
              appliedUsernameRef.current = username;
              appliedFromDateRef.current = fromDate;
              appliedToDateRef.current = toDate;
              setPage(1);
              void load(1);
            }}
          />

          {error ? (
            <p className="px-5 py-2 text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          <ListTableSection>
            <Table className="w-full min-w-max rounded-lg">
              <TableHeader className="w-full bg-white uppercase">
                <TableHead className="!px-6 !py-3 !text-left">NAME</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">AMOUNT</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">BONUS</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">UTR</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">A/C</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">STATUS</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">CREATED</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">UPDATED</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">TIMER</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">ACTIONS</TableHead>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableEmpty colSpan={10} message="Loading…" />
                ) : rows.length === 0 ? (
                  <TableEmpty colSpan={10} message="No transactions yet." />
                ) : (
                  rows.map((row) => {
                    const statusLabel = depositRowStatus(row);
                    const { showUpdate, showRollback } = depositRowActionVisibility(row);
                    const busyUpdate = rowActionKey === `${row.id}-update`;
                    const busyRollback = rowActionKey === `${row.id}-rollback`;
                    return (
                      <TableRow key={row.id} className="hover:!bg-gray-50">
                        <TableCell className="!px-6 !py-3">
                          <div className="flex items-baseline gap-1.5">
                            <a className="text-blue-600" href="#" onClick={(e) => e.preventDefault()}>
                              {row.user?.username ?? "—"}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center">{formatCurrency(row.amount)}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center">{formatCurrency(row.bonusAmount ?? 0)}</TableCell>
                        <TableCell className="!px-6 !py-3">{row.utrNo ?? "—"}</TableCell>
                        <TableCell className="!px-6 !py-3">{row.acNo ?? "—"}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center">
                          <Badge
                            variant={statusBadgeVariantForDeposit(statusLabel)}
                            className="max-w-max"
                          >
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center">{formatDateTime(row.createdOn)}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center">{formatDateTime(row.updatedOn)}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center tabular-nums">{formatTimer(row.createdOn)}</TableCell>
                        <TableCell className="!px-6 !py-3">
                          <div className="flex min-w-[5.5rem] flex-col items-stretch gap-1.5">
                            {showUpdate ? (
                              <button
                                type="button"
                                disabled={rowActionKey !== null}
                                aria-busy={busyUpdate}
                                onClick={() => void handleRowUpdate(row.id)}
                                className="rounded border border-green-900/35 bg-green-700 px-2 py-1.5 text-center text-xs font-semibold leading-tight text-white shadow-sm transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {busyUpdate ? "…" : "Update"}
                              </button>
                            ) : null}
                            {showRollback ? (
                              <button
                                type="button"
                                disabled={rowActionKey !== null}
                                aria-busy={busyRollback}
                                onClick={() => void handleRowRollback(row.id)}
                                className="rounded border border-red-950/30 bg-red-700 px-2 py-1.5 text-center text-xs font-semibold leading-tight text-white shadow-sm transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {busyRollback ? "…" : "Rollback"}
                              </button>
                            ) : null}
                            {!showUpdate && !showRollback ? (
                              <span className="py-1 text-center text-xs text-muted">—</span>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ListTableSection>

          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPage(1); setPageSize(s); }}
            pageSizeOptions={[15, 50, 100, 250, 500]}
          />
        </div>
      </ListPageFrame>
    </div>
  );
}
