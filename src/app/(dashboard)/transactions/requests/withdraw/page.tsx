"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import WithdrawRequestUpdateModal from "@/components/transactions/WithdrawRequestUpdateModal";
import { ArrowUpFromLine, Copy, HandCoins, ImageIcon } from "lucide-react";
import { getOffPayOut, getPayInOutSlip, type OffPayInRecord } from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { downloadCsv } from "@/utils/csvDownload";
import { dateRangeToISO, formatDateTime } from "@/utils/date";

/** Matches POST /payment/getoffpayout `searchQuery.status` (numeric string). */
const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "1" },
  { label: "InProcess", value: "2" },
  { label: "Confirm", value: "3" },
  { label: "Rejected", value: "4" },
];

const TAB_DEPOSIT = "/transactions/requests/deposit";
const TAB_WITHDRAW = "/transactions/requests/withdraw";

function initialDateRange(): { from: string; to: string } {
  const now = new Date();
  const toStr = now.toISOString().slice(0, 10);
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
  const fromStr = from.toISOString().slice(0, 10);
  return { from: fromStr, to: toStr };
}

function withdrawStatusLabel(status: number | undefined): string {
  if (status === 1) return "Pending";
  if (status === 2) return "InProcess";
  if (status === 3) return "Confirm";
  if (status === 4) return "Rejected";
  if (status != null) return `Status ${status}`;
  return "—";
}

function withdrawStatusBadgeVariant(
  status: number | undefined,
): "success" | "error" | "warning" | "default" | "info" {
  if (status === 1) return "info";
  if (status === 2) return "error";
  if (status === 3) return "success";
  if (status === 4) return "error";
  return "default";
}

/** Elapsed since `createdOn` — compact (e.g. `48s`) to match withdrawal queue UIs. */
function formatElapsedShort(createdOn?: string): string {
  if (!createdOn) return "—";
  const created = new Date(createdOn);
  if (Number.isNaN(created.getTime())) return "—";
  const sec = Math.floor(Math.max(0, Date.now() - created.getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const trimmed = value.trim();
  const copyable = trimmed.length > 0;
  return (
    <div className="flex items-start justify-between gap-2 text-left text-sm leading-snug">
      <span>
        {label}
        {copyable ? ` ${trimmed}` : " —"}
      </span>
      {copyable ? (
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-muted hover:bg-surface-muted hover:text-foreground"
          aria-label={`Copy ${label.replace(/[:\\s]+$/, "").trim()}`}
          onClick={() => void navigator.clipboard.writeText(trimmed)}
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export default function TransactionsRequestWithdrawPage() {
  const pathname = usePathname();
  const isWithdrawTab = pathname?.includes("/withdraw") ?? false;

  const seededRange = useMemo(() => initialDateRange(), []);
  const [status, setStatus] = useState("");
  const [username, setUsername] = useState("");
  const [fromDate, setFromDate] = useState(seededRange.from);
  const [toDate, setToDate] = useState(seededRange.to);
  const appliedStatusRef = useRef("");
  const appliedUsernameRef = useRef("");
  const appliedFromDateRef = useRef(seededRange.from);
  const appliedToDateRef = useRef(seededRange.to);

  const [rows, setRows] = useState<OffPayInRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateRow, setUpdateRow] = useState<OffPayInRecord | null>(null);

  const [slipViewerOpen, setSlipViewerOpen] = useState(false);
  const [slipViewerSrc, setSlipViewerSrc] = useState<string | null>(null);
  const [slipViewerLoading, setSlipViewerLoading] = useState(false);
  const [slipViewerMessage, setSlipViewerMessage] = useState<string | null>(null);

  /** `imageId` from GET getoffpayout row — not the withdrawal request `id`. */
  const openPayoutSlipViewer = async (imageId: string) => {
    const key = imageId.trim();
    if (!key) {
      setSlipViewerMessage("No slip reference (imageId) on this row.");
      setSlipViewerOpen(true);
      return;
    }
    setSlipViewerOpen(true);
    setSlipViewerSrc(null);
    setSlipViewerMessage(null);
    setSlipViewerLoading(true);
    try {
      const data = await getPayInOutSlip(key);
      if (!data) {
        setSlipViewerMessage("No payout slip uploaded for this request.");
        return;
      }
      setSlipViewerSrc(data);
    } catch (e) {
      setSlipViewerMessage(
        e instanceof Error ? e.message : "Could not load payout slip.",
      );
    } finally {
      setSlipViewerLoading(false);
    }
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
        const res = await getOffPayOut(
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
          typeof res.total === "number"
            ? res.total
            : Array.isArray(res.data)
              ? res.data.length
              : 0,
        );
      } catch (e) {
        setRows([]);
        setTotalItems(0);
        setError(e instanceof Error ? e.message : "Failed to load withdraw requests.");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onExport = () => {
    const header = [
      "Name",
      "Amount",
      "Cash",
      "A/C No.",
      "IFSC",
      "Bank",
      "Account name",
      "Status",
      "Created",
      "Updated",
      "Timer",
    ];
    const out = rows.map((row) => {
      const st = withdrawStatusLabel(row.status);
      return [
        String(row.user?.username ?? ""),
        Number(row.amount ?? 0),
        "",
        String(row.acNo ?? ""),
        String(row.ifscCode ?? ""),
        String(row.bankName ?? ""),
        String(row.acName ?? ""),
        st,
        formatDateTime(row.createdOn),
        formatDateTime(row.updatedOn),
        formatElapsedShort(row.createdOn),
      ];
    });
    downloadCsv(`withdraw-requests-${fromDate}-${toDate}.csv`, header, out);
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <WithdrawRequestUpdateModal
        open={Boolean(updateRow)}
        onClose={() => setUpdateRow(null)}
        row={updateRow}
        currentStatusLabel={updateRow ? withdrawStatusLabel(updateRow.status) : "—"}
        onSaved={() => void load()}
      />

      <Modal
        isOpen={slipViewerOpen}
        onClose={() => {
          setSlipViewerOpen(false);
          setSlipViewerSrc(null);
          setSlipViewerMessage(null);
        }}
        title="Payout slip"
        maxWidthClassName="max-w-4xl"
        bodyClassName={`${DIALOG_BODY_COMPACT} flex min-h-[120px] flex-col items-center justify-center`}
        footer={
          <DialogActions>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                setSlipViewerOpen(false);
                setSlipViewerSrc(null);
                setSlipViewerMessage(null);
              }}
            >
              Close
            </Button>
          </DialogActions>
        }
      >
        <DialogSection>
          {slipViewerLoading ? (
            <p className="text-center text-sm text-muted">Loading…</p>
          ) : slipViewerMessage ? (
            <p className="text-center text-sm text-error" role="alert">
              {slipViewerMessage}
            </p>
          ) : slipViewerSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL from API
            <img
              src={slipViewerSrc}
              alt="Payout slip"
              className="mx-auto max-h-[85vh] w-auto max-w-full rounded border border-border"
            />
          ) : null}
        </DialogSection>
      </Modal>

      <PageHeader
        title="Request Withdraw"
        breadcrumbs={["Transactions", "Requests", "Withdraw"]}
      />

      <ListPageFrame>
        <div
          className="flex justify-start rounded-t-lg bg-white sm:w-full sm:justify-center"
          role="tablist"
          aria-orientation="horizontal"
        >
          <Link
            href={TAB_DEPOSIT}
            className={`flex flex-1 items-center justify-center gap-2 ${
              !isWithdrawTab ? "border-primary text-primary" : "border-transparent text-muted"
            } border-b-2 px-6 py-3`}
            aria-selected={!isWithdrawTab}
          >
            <HandCoins className="h-4 w-4" aria-hidden />
            Deposit Request
          </Link>
          <Link
            href={TAB_WITHDRAW}
            className={`flex flex-1 items-center justify-center gap-2 ${
              isWithdrawTab ? "border-primary text-primary" : "border-transparent text-muted"
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
            onExport={onExport}
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
                <TableHead className="!px-6 !py-3 !text-left">Name</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">Amount</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">Cash</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">A/C</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">Status</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">Created</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">Updated</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">Timer</TableHead>
                <TableHead className="!px-6 !py-3 !text-center"> </TableHead>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableEmpty colSpan={9} message="Loading…" />
                ) : rows.length === 0 ? (
                  <TableEmpty colSpan={9} message="No transactions yet." />
                ) : (
                  rows.map((row) => {
                    const statusLabel = withdrawStatusLabel(row.status);
                    const st = row.status;
                    const showUpdate = st !== 3 && st !== 4;
                    const slipImageId = String(row.imageId ?? "").trim();
                    const showSlipIcon =
                      showUpdate &&
                      slipImageId.length > 0 &&
                      row.hasPayOutSlip !== false;
                    const acNo = String(row.acNo ?? "").trim();
                    const ifsc = String(row.ifscCode ?? "").trim();
                    const bank = String(row.bankName ?? "").trim();
                    const acNm = String(row.acName ?? "").trim();

                    return (
                      <TableRow key={row.id} className="hover:!bg-gray-50">
                        <TableCell className="!px-6 !py-3">
                          <div className="flex flex-wrap items-baseline gap-x-1">
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
                            {row.user?.parent?.username ? (
                              <span className="text-muted">
                                ({String(row.user.parent.username)})
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className={`!px-6 !py-3 text-center tabular-nums ${signedAmountTextClass(Number(row.amount ?? 0))}`}>
                          {formatCurrency(row.amount)}
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center text-muted">—</TableCell>
                        <TableCell className="!px-6 !py-3 align-top">
                          <div className="flex min-w-[200px] flex-col gap-1">
                            <CopyLine label="A/C No. : " value={acNo} />
                            <CopyLine label="IFSC : " value={ifsc} />
                            <CopyLine label="Bank : " value={bank} />
                            <CopyLine label="Name : " value={acNm} />
                          </div>
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center">
                          <Badge
                            variant={withdrawStatusBadgeVariant(row.status)}
                            className="max-w-max"
                          >
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center text-sm">
                          {formatDateTime(row.createdOn)}
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center text-sm">
                          {row.updatedOn ? formatDateTime(row.updatedOn) : "—"}
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center tabular-nums text-sm">
                          {formatElapsedShort(row.createdOn)}
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center">
                          {showUpdate ? (
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                onClick={() => setUpdateRow(row)}
                              >
                                Update
                              </Button>
                              {showSlipIcon ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="min-w-9 px-2"
                                  aria-label="View payout slip"
                                  title="View payout slip"
                                  onClick={() => void openPayoutSlipViewer(slipImageId)}
                                >
                                  <ImageIcon className="h-4 w-4" aria-hidden />
                                </Button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
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
            onPageSizeChange={(s) => {
              setPage(1);
              setPageSize(s);
            }}
            pageSizeOptions={[15, 50, 100, 250, 500]}
          />
        </div>
      </ListPageFrame>
    </div>
  );
}
