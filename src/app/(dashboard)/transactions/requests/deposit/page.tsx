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
  Button,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
  Modal,
  DialogActions,
  DialogSection,
  DIALOG_BODY_COMPACT,
} from "@/components";
import { ArrowUpFromLine, HandCoins, Info } from "lucide-react";
import DepositRequestUpdateModal from "@/components/transactions/DepositRequestUpdateModal";
import {
  getOffPayIn,
  rollbackOffPayIn,
  type OffPayInRecord,
} from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { downloadCsv } from "@/utils/csvDownload";
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
  const [updateRow, setUpdateRow] = useState<OffPayInRecord | null>(null);
  const [rollbackRow, setRollbackRow] = useState<OffPayInRecord | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  type DepositUiStatus = "Init" | "Confirm" | "Cancel" | "Expired";

  /**
   * API sends `status` on the pay-in row; `comment` disambiguates (e.g. both use status 2 for
   * "Payment Received" vs "Payment Not Received"). `user.status` is the member account, not this flow.
   */
  const depositRowStatus = (row: OffPayInRecord): DepositUiStatus | string => {
    const n = row.status;
    if (n === 1) return "Init";
    if (n === 2) return "Confirm";
    if (n === 3) return "Cancel";
    if (n === 4) return "Expired";

    const comment = String(row.comment ?? "").trim();
    const lo = comment.toLowerCase();

    if (lo.includes("payment received")) return "Confirm";
    if (lo.includes("payment not received")) return "Cancel";
    if (lo.includes("rollback")) return "Cancel";
    if (lo.includes("expired") || lo.includes("expire")) return "Expired";

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
      !isRollbackOutcome && resolved === "Confirm";

    return { showUpdate, showRollback };
  };

  const handleConfirmRollback = async () => {
    const id = rollbackRow?.id;
    if (!id) return;
    setRowActionKey(`${id}-rollback`);
    try {
      await rollbackOffPayIn({ id });
      setRollbackRow(null);
      await load();
    } finally {
      setRowActionKey(null);
    }
  };

  const formatTimer = (createdOn?: string, updatedOn?: string) => {
    if (!createdOn) return "—";
    const start = new Date(createdOn).getTime();
    if (Number.isNaN(start)) return "—";

    let end = now;
    if (updatedOn) {
      const u = new Date(updatedOn).getTime();
      if (!Number.isNaN(u)) end = u;
    }

    const sec = Math.floor(Math.max(0, end - start) / 1000);
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}m ${s}s`;
    }
    if (sec < 86400) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return `${h}h ${m}m ${s}s`;
    }
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
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
      <DepositRequestUpdateModal
        open={Boolean(updateRow)}
        onClose={() => setUpdateRow(null)}
        row={updateRow}
        currentStatusLabel={
          updateRow ? String(depositRowStatus(updateRow)) : "—"
        }
        onSaved={() => void load()}
      />

      <Modal
        isOpen={Boolean(rollbackRow)}
        onClose={() => setRollbackRow(null)}
        title="Confirm"
        maxWidthClassName="max-w-md"
        bodyClassName={DIALOG_BODY_COMPACT}
        footer={
          <DialogActions>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={rowActionKey !== null}
              onClick={() => void handleConfirmRollback()}
            >
              Proceed
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setRollbackRow(null)}
            >
              Reject
            </Button>
          </DialogActions>
        }
      >
        <DialogSection>
          <p className="text-sm text-foreground">
            Are you sure you want to rollback
            <span className="tabular-nums font-medium">
              {rollbackRow ? formatCurrency(rollbackRow.amount) : "—"}
            </span>
            ?
          </p>
        </DialogSection>
      </Modal>

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
            onExport={() => {
              const header = [
                "Username",
                "Amount",
                "Bonus",
                "UTR",
                "A/C",
                "Status",
                "Created",
                "Updated",
                "Timer (hh:mm:ss from created)",
              ];
              const out = rows.map((row) => {
                const statusLabel = depositRowStatus(row);
                return [
                  String(row.user?.username ?? ""),
                  Number(row.amount ?? 0),
                  Number(row.bonusAmount ?? 0),
                  String(row.utrNo ?? ""),
                  String(row.acNo ?? ""),
                  String(statusLabel),
                  formatDateTime(row.createdOn),
                  formatDateTime(row.updatedOn),
                  formatTimer(row.createdOn),
                ];
              });
              downloadCsv(`deposit-requests-${fromDate}-${toDate}.csv`, header, out);
            }}
            exportDisabled={loading || rows.length === 0}
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
                    const busyRollback = rowActionKey === `${row.id}-rollback`;
                    return (
                      <TableRow key={row.id} className="hover:!bg-gray-50">
                        <TableCell className="!px-6 !py-3">
                          <div className="flex flex-col gap-0.5">
                            {row.user?.id ? (
                              <Link
                                href={`/players/${encodeURIComponent(String(row.user.id))}`}
                                className="text-primary hover:underline"
                              >
                                {row.user?.username ?? "—"}
                              </Link>
                            ) : (
                              <span className="text-foreground">{row.user?.username ?? "—"}</span>
                            )}
                            {row.user?.mobile && (
                              <span className="text-[11px] text-muted-foreground">
                                ({row.user.mobile})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`!px-6 !py-3 text-center tabular-nums ${signedAmountTextClass(Number(row.amount ?? 0))}`}>{formatCurrency(row.amount)}</TableCell>
                        <TableCell className={`!px-6 !py-3 text-center tabular-nums ${signedAmountTextClass(Number(row.bonusAmount ?? 0))}`}>{formatCurrency(row.bonusAmount ?? 0)}</TableCell>
                        <TableCell className="!px-6 !py-3">{row.utrNo ?? "—"}</TableCell>
                        <TableCell className="!px-6 !py-3">{row.acNo ?? "—"}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center">
                          <div className="group relative flex items-center justify-center gap-1.5">
                            <Badge
                              variant={statusBadgeVariantForDeposit(statusLabel)}
                              className="max-w-max"
                            >
                              {statusLabel}
                            </Badge>
                            {row.comment && (
                              <div className="relative inline-flex items-center">
                                <Info className="h-3.5 w-3.5 cursor-pointer text-info/70 transition-colors hover:text-info" />
                                <div className="absolute right-full top-1/2 z-50 mr-2 w-max max-w-[200px] -translate-y-1/2 rounded-lg bg-[#2DD4BF] px-3 py-2 text-[12px] font-semibold text-white shadow-xl opacity-0 transition-all group-hover:opacity-100 pointer-events-none">
                                  {row.comment}
                                  <div className="absolute left-full top-1/2 -mt-1.5 border-[6px] border-transparent border-l-[#2DD4BF]" />
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center">{formatDateTime(row.createdOn)}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center">{formatDateTime(row.updatedOn)}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center tabular-nums">{formatTimer(row.createdOn, row.updatedOn)}</TableCell>
                        <TableCell className="!px-6 !py-3">
                          <div className="flex min-w-[5.5rem] flex-col items-stretch gap-1.5">
                            {showUpdate ? (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                fullWidth
                                disabled={rowActionKey !== null}
                                onClick={() => setUpdateRow(row)}
                              >
                                Update
                              </Button>
                            ) : null}
                            {showRollback ? (
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                fullWidth
                                disabled={rowActionKey !== null}
                                aria-busy={busyRollback}
                                onClick={() => setRollbackRow(row)}
                              >
                                {busyRollback ? "…" : "Rollback"}
                              </Button>
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
