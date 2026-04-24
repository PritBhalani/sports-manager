"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  ListPageFrame,
  ListTableSection,
  Button,
  Input,
  FilterBar,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
  Badge,
} from "@/components";
import {
  getTransferList,
  transferIn,
  transferOut,
} from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { formatDateTime } from "@/utils/date";
import { timestampMs } from "@/utils/date";
import type { TransferRecord } from "@/types/account.types";

const PAGE_SIZE = 15;

export default function TransferPage() {
  const [activeForm, setActiveForm] = useState<"in" | "out">("in");
  const [userId, setUserId] = useState("");
  const [chips, setChips] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [list, setList] = useState<TransferRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [searchUserId, setSearchUserId] = useState("");
  const [listLoading, setListLoading] = useState(false);

  const currentUserId = "me"; // Replace with real auth user id when available

  const fetchList = () => {
    setListLoading(true);
    getTransferList(
      { page, pageSize, orderByDesc: true },
      { userId: searchUserId.trim() || undefined },
      currentUserId
    )
      .then((res) => {
        const data = Array.isArray(res?.data) ? res.data : [];
        setList(data);
        setTotalItems(res?.total ?? data.length);
      })
      .catch(() => {
        setList([]);
        setTotalItems(0);
      })
      .finally(() => setListLoading(false));
  };

  useEffect(() => {
    fetchList();
  }, [page, pageSize, searchUserId]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const chipsNum = parseFloat(chips);
    if (!userId.trim() || Number.isNaN(chipsNum) || chipsNum <= 0) {
      setSubmitMessage({ type: "error", text: "Enter valid User ID and chips." });
      return;
    }
    setSubmitLoading(true);
    setSubmitMessage(null);
    const base = {
      isTransfer: true as const,
      chips: chipsNum,
      userId: userId.trim(),
      timestamp: timestampMs(),
    };
    try {
      if (activeForm === "in") {
        await transferIn({ ...base, dwType: "D" });
      } else {
        await transferOut({ ...base, dwType: "W" });
      }
      setSubmitMessage({
        type: "success",
        text: activeForm === "in" ? "Transfer in submitted." : "Transfer out submitted.",
      });
      setChips("");
      fetchList();
    } catch {
      setSubmitMessage({ type: "error", text: "Request failed. Try again." });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Transfer"
        breadcrumbs={["Accounts", "Transfer"]}
      />

      <Card title="Transfer chips" className="mb-4 max-w-lg">
        <div className="mb-4 flex gap-2">
          <Button
            variant={activeForm === "in" ? "primary" : "outline"}
            size="sm"
            onClick={() => {
              setActiveForm("in");
              setSubmitMessage(null);
            }}
          >
            Transfer In
          </Button>
          <Button
            variant={activeForm === "out" ? "primary" : "outline"}
            size="sm"
            onClick={() => {
              setActiveForm("out");
              setSubmitMessage(null);
            }}
          >
            Transfer Out
          </Button>
        </div>
        <form onSubmit={handleTransfer} className="flex flex-col gap-4">
          <Input
            label="User ID"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          />
          <Input
            label="Chips"
            type="number"
            step="any"
            min="0"
            placeholder="0.00"
            value={chips}
            onChange={(e) => setChips(e.target.value)}
            required
          />
          {submitMessage && (
            <p
              className={`text-sm ${
                submitMessage.type === "success"
                  ? "text-success"
                  : "text-error"
              }`}
            >
              {submitMessage.text}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={submitLoading}>
            {submitLoading
              ? "Submitting…"
              : activeForm === "in"
                ? "Transfer In"
                : "Transfer Out"}
          </Button>
        </form>
      </Card>

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input
              placeholder="Filter by User ID"
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              className="max-w-[200px]"
            />
            <Button variant="outline" onClick={() => fetchList()}>
              Refresh
            </Button>
          </FilterBar>

          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>User / ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead >Chips</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Date</TableHead>
          </TableHeader>
          <TableBody>
            {listLoading ? (
              <TableEmpty
                colSpan={5}
                message="Loading…"
              />
            ) : list.length === 0 ? (
              <TableEmpty colSpan={5} message="No transfers yet." />
            ) : (
              list.map((row, i) => {
                const chipsN = Number(row.chips ?? 0);
                const signedChips = row.dwType === "D" ? chipsN : -chipsN;
                return (
                <TableRow key={row.id ?? i}>
                  <TableCell>
                    {row.username ?? row.userCode ?? row.userId ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.dwType === "D" ? "success" : "default"}>
                      {row.dwType === "D" ? "In" : "Out"}
                    </Badge>
                  </TableCell>
                  <TableCell  className={`tabular-nums ${signedAmountTextClass(signedChips)}`}>
                    {formatCurrency(row.chips)}
                  </TableCell>
                  <TableCell>{row.comment ?? "—"}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt ?? row.timestamp)}</TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
            </Table>
            <TablePagination
              page={page}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
