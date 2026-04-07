"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
import { ArrowUpDown, ArrowUpFromLine, HandCoins } from "lucide-react";
import { getOffPayOut, type OffPayInRecord } from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { downloadCsv } from "@/utils/csvDownload";
import { dateRangeToISO, formatDateTime } from "@/utils/date";

const STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Approved", value: "approved" },
  { label: "Pending", value: "pending" },
  { label: "Declined", value: "declined" },
];

const TAB_DEPOSIT = "/transactions/requests/deposit";
const TAB_WITHDRAW = "/transactions/requests/withdraw";

export default function TransactionsRequestWithdrawPage() {
  const pathname = usePathname();
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [username, setUsername] = useState("");
  const [rows, setRows] = useState<OffPayInRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));
    setFromDate(from.toISOString().slice(0, 10));
    setToDate(toStr);
  }, []);

  const statusBadgeVariant = (s: number | undefined): "success" | "error" | "warning" | "default" | "info" => {
    if (s === 2) return "error";
    if (s === 3) return "warning";
    if (s === 1) return "info";
    if (s === 4) return "success";
    return "default";
  };

  const fetchWithdrawals = async () => {
    if (!fromDate || !toDate) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);

    setLoading(true);
    setListError(null);

    try {
      const res = await getOffPayOut(
        {
          pageSize,
          groupBy: "",
          page,
          orderBy: "",
          orderByDesc: false,
        },
        {
          status,
          fromDate: fromISO,
          toDate: toISO,
          userId: "",
        },
      );

      setRows(Array.isArray(res.data) ? res.data : []);
      setTotalItems(typeof res.total === "number" ? res.total : (Array.isArray(res.data) ? res.data.length : 0));
    } catch (e) {
      setRows([]);
      setTotalItems(0);
      setListError(e instanceof Error ? e.message : "Failed to load withdraw requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!fromDate || !toDate) return;
    void fetchWithdrawals();
  }, [page, pageSize, fromDate, toDate]);

  const onSearch = () => {
    fetchWithdrawals();
  };

  const onExport = () => {
    const header = [
      "Username",
      "UTR/TXN",
      "Account mode",
      "Amount",
      "Status",
      "Created",
      "Updated",
    ];
    const out = rows.map((row) => {
      const statusLabel =
        String(row.comment ?? "").trim() ||
        (row.status != null ? `Status ${row.status}` : "—");
      return [
        String(row.user?.username ?? ""),
        String(row.utrNo ?? ""),
        String(row.detailType ?? "manual"),
        Number(row.amount ?? 0),
        statusLabel,
        formatDateTime(row.createdOn),
        formatDateTime(row.updatedOn),
      ];
    });
    downloadCsv(`withdraw-requests-${fromDate}-${toDate}.csv`, header, out);
  };

  const isWithdrawTab = pathname?.includes("/withdraw") ?? false;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
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
            username={username}
            onUsernameChange={setUsername}
            status={status}
            onStatusChange={setStatus}
            statusOptions={STATUS_OPTIONS}
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onSearch={onSearch}
            onExport={onExport}
          />

          {listError ? (
            <p className="px-5 py-2 text-sm text-error" role="alert">
              {listError}
            </p>
          ) : null}

          <ListTableSection>
            <Table className="w-full min-w-max rounded-lg">
              <TableHeader className="w-full bg-white uppercase">
                <TableHead className="!px-6 !py-3 !text-left">USERNAME</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">UTR/TXN CODE</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">ACCOUNT | MODE</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">AMOUNT</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">STATUS</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">ACTIONS</TableHead>
                <TableHead className="!px-6 !py-3 !text-center">
                  <div className="flex items-center justify-center gap-2">
                    CREATED
                    <ArrowUpDown className="h-4 w-4" aria-hidden />
                  </div>
                </TableHead>
                <TableHead className="!px-6 !py-3 !text-center">UPDATED AT | BY</TableHead>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableEmpty colSpan={8} message="Loading…" />
                ) : rows.length === 0 ? (
                  <TableEmpty colSpan={8} message="No transactions yet." />
                ) : (
                  rows.map((row) => {
                    const statusLabel =
                      String(row.comment ?? "").trim() ||
                      (row.status != null ? `Status ${row.status}` : "—");
                    return (
                      <TableRow key={row.id} className="hover:!bg-gray-50">
                        <TableCell className="!px-6 !py-3">
                          <div className="flex items-baseline gap-1.5">
                            <a className="text-blue-600" href="#" onClick={(e) => e.preventDefault()}>
                              {row.user?.username ?? "—"}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="!px-6 !py-3">{row.utrNo ?? "—"}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center">{String(row.detailType ?? "manual")}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center">{formatCurrency(row.amount)}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center">
                          <Badge
                            variant={statusBadgeVariant(row.status)}
                            className="max-w-max rounded-xl bg-red-200 px-3 py-1 text-xs font-semibold uppercase text-red-800"
                          >
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center">
                          <button type="button" className="text-blue-600">
                            <span className="underline-offset-2 hover:underline">View</span>
                          </button>
                        </TableCell>
                        <TableCell className="!px-6 !py-3 text-center">{formatDateTime(row.createdOn)}</TableCell>
                        <TableCell className="!px-6 !py-3 text-center">
                          {formatDateTime(row.updatedOn)}
                          <div className="text-xs">
                            <a className="text-blue-600" href="#" onClick={(e) => e.preventDefault()}>
                              —
                            </a>
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
