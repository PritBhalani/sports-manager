"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Select,
  Button,
  Tabs,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components";
import { dateRangeToISO, formatDateTime, formatUpdateMinusCreateGap, todayRangeUTC } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { getOffPayIn, getOffPayOut, type OffPayInRecord } from "@/services/account.service";

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Declined", value: "declined" },
];

function readName(row: OffPayInRecord): string {
  return (
    row.user?.username ||
    row.user?.parent?.username ||
    (row.id ? String(row.id) : "—")
  );
}

function readAccount(row: OffPayInRecord): string {
  return row.acNo ? String(row.acNo) : "—";
}

function readUtr(row: OffPayInRecord): string {
  return row.utrNo ? String(row.utrNo) : "—";
}

function statusText(row: OffPayInRecord): string {
  const s = Number(row.status);
  if (s === 4) return "Approved";
  if (s === 3) return "Pending";
  if (s === 2) return "Declined";
  if (s === 1) return "Processing";
  return row.status != null ? String(row.status) : "—";
}

export default function B2cActivityPage() {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [usernameMobile, setUsernameMobile] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [rows, setRows] = useState<OffPayInRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  const load = useCallback(() => {
    if (!fromDate || !toDate) return;
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);
    setLoading(true);
    setError(null);

    const fn = activeTab === "deposit" ? getOffPayIn : getOffPayOut;
    fn(
      {
        page,
        pageSize,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      {
        status: status || "",
        fromDate: fromISO,
        toDate: toISO,
        // API calls the field userId; UI lets user type username/mobile. Backend may accept it.
        userId: usernameMobile.trim() || "",
      },
    )
      .then((res) => {
        setRows(Array.isArray(res.data) ? res.data : []);
        setTotal(typeof res.total === "number" ? res.total : 0);
      })
      .catch((e) => {
        setRows([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load B2C activity.");
      })
      .finally(() => setLoading(false));
  }, [fromDate, toDate, status, usernameMobile, page, pageSize, activeTab, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const tabItems = useMemo(
    () => [
      {
        id: "deposit",
        label: "Deposit Requests",
        content: null,
      },
      {
        id: "withdraw",
        label: "Withdrawal Requests",
        content: null,
      },
    ],
    [],
  );

  const isDeposit = activeTab === "deposit";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader title="B2C Activity" breadcrumbs={["Reports", "B2C Activity"]} />

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <div className="px-4 pt-2 sm:px-6">
          <Tabs
            tabs={tabItems}
            activeId={activeTab}
            onTabChange={(id) => setActiveTab(id as "deposit" | "withdraw")}
          />
        </div>

          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input
              type="date"
              label="From"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="max-w-[170px]"
            />
            <Input
              type="date"
              label="To"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="max-w-[170px]"
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
              className="min-w-[160px]"
            />
            <Input
              label="Username/Mobile"
              placeholder="Username/Mobile"
              value={usernameMobile}
              onChange={(e) => {
                setUsernameMobile(e.target.value);
                setPage(1);
              }}
              className="min-w-[180px]"
            />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => {
                  setPage(1);
                  setRefreshKey((k) => k + 1);
                }}
              >
                {isDeposit ? "Search Deposit" : "Search Withdrawal"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  const range = todayRangeUTC();
                  setFromDate(range.fromDate.slice(0, 10));
                  setToDate(range.toDate.slice(0, 10));
                  setStatus("");
                  setUsernameMobile("");
                  setPage(1);
                  setRefreshKey((k) => k + 1);
                }}
              >
                Clear
              </Button>
            </div>
          </FilterBar>

          <ListTableSection>
            <Table className="w-full min-w-max rounded-lg">
              <TableHeader className="w-full bg-white uppercase">
                <TableHead className="!px-6 !py-3 !text-left">NAME</TableHead>
                <TableHead className="!px-6 !py-3 !text-right">AMOUNT</TableHead>
                {isDeposit ? (
                  <TableHead className="!px-6 !py-3 !text-right">BONUS</TableHead>
                ) : null}
                {isDeposit ? (
                  <TableHead className="!px-6 !py-3 !text-left">UTR</TableHead>
                ) : null}
                <TableHead className="!px-6 !py-3 !text-left">A/C</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">STATUS</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">CREATED</TableHead>
                <TableHead className="!px-6 !py-3 !text-left">
                  {isDeposit ? "UPDATE" : "UPDATED"}
                </TableHead>
                {!isDeposit ? (
                  <TableHead className="!px-6 !py-3 !text-left">TIMER</TableHead>
                ) : null}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableEmpty colSpan={isDeposit ? 8 : 7} message="Loading…" />
                ) : rows.length === 0 ? (
                  <TableEmpty
                    colSpan={isDeposit ? 8 : 7}
                    message="No records found for selected filter and time period."
                  />
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="!px-6 !py-4">{readName(row)}</TableCell>
                      <TableCell align="right" className="!px-6 !py-4 tabular-nums">
                        {formatCurrency(row.amount)}
                      </TableCell>
                      {isDeposit ? (
                        <TableCell align="right" className="!px-6 !py-4 tabular-nums">
                          {formatCurrency(row.bonusAmount ?? 0)}
                        </TableCell>
                      ) : null}
                      {isDeposit ? (
                        <TableCell className="!px-6 !py-4">{readUtr(row)}</TableCell>
                      ) : null}
                      <TableCell className="!px-6 !py-4">{readAccount(row)}</TableCell>
                      <TableCell className="!px-6 !py-4">{statusText(row)}</TableCell>
                      <TableCell className="!px-6 !py-4 whitespace-nowrap">
                        {formatDateTime(row.createdOn)}
                      </TableCell>
                      <TableCell className="!px-6 !py-4 whitespace-nowrap">
                        {formatDateTime(row.updatedOn)}
                      </TableCell>
                      {!isDeposit ? (
                        <TableCell className="!px-6 !py-4 whitespace-nowrap">
                          {formatUpdateMinusCreateGap(row.createdOn, row.updatedOn)}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {!loading && total > 0 ? (
              <TablePagination
                page={page}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setPage(1);
                }}
              />
            ) : null}
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}

