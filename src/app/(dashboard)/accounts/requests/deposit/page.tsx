"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Input, Select } from "@/components";
import { Calendar, Download, MoreHorizontal } from "lucide-react";

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

export default function RequestDepositPage() {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [status, setStatus] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [username, setUsername] = useState("");

  const onExport = () => {
    // TODO: wire to export API later
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Request Deposit"
        breadcrumbs={["Transactions", "Request Deposit"]}
      />

      <Card className="space-y-4 sm:space-y-5">
        {/* Tabs – Deposit Request / Withdraw Request */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2 sm:pb-3">
          <div className="flex gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab("deposit")}
              className={`flex items-center gap-2 border-b-2 pb-2 transition-colors ${
                activeTab === "deposit"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Deposit Request
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("withdraw")}
              className={`flex items-center gap-2 border-b-2 pb-2 transition-colors ${
                activeTab === "withdraw"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Withdraw Request
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Search username / txn/utr code"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-10"
          />
          <Select
            aria-label="Depositors filter"
            value="allDepositors"
            onChange={() => {}}
            options={[{ label: "All Depositors", value: "allDepositors" }]}
            className="h-10"
          />
          <Select
            aria-label="Modes filter"
            value="allModes"
            onChange={() => {}}
            options={[{ label: "All Modes", value: "allModes" }]}
            className="h-10"
          />
          <Select
            aria-label="Accounts filter"
            value="allAccounts"
            onChange={() => {}}
            options={[{ label: "All Accounts", value: "allAccounts" }]}
            className="h-10"
          />
          <Select
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_OPTIONS}
            className="h-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Select
              aria-label="Time range"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              options={TIME_RANGE_OPTIONS}
              className="h-10 min-w-[130px]"
            />
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            >
              <Calendar className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              leftIcon={<Download className="h-4 w-4" aria-hidden />}
              onClick={onExport}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Table stub / empty state */}
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="hidden bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-zinc-500 sm:grid sm:grid-cols-8">
            <span className="col-span-2">Username</span>
            <span>Txn / UTR</span>
            <span>Mode</span>
            <span>Account</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Date</span>
          </div>
          <div className="px-4 py-8 text-center text-sm text-zinc-500">
            No transactions yet.
          </div>
        </div>
      </Card>
    </div>
  );
}

