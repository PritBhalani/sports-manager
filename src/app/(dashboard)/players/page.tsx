"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Input, Select } from "@/components";
import { Download, Filter } from "lucide-react";

type PlayerRow = {
  id: string;
  name: string;
  username: string;
  parent: string;
  status: "ACTIVE" | "BLOCKED";
  cash: number;
  coins: number;
  registeredAt: string;
};

const MOCK_PLAYERS: PlayerRow[] = [
  {
    id: "1",
    name: "Manan desai",
    username: "BHAR_Manudec",
    parent: "Bharatplays",
    status: "ACTIVE",
    cash: 0,
    coins: 100,
    registeredAt: "Tue 02 Jul 2024, 15:03:20",
  },
  {
    id: "2",
    name: "Hemraj",
    username: "BHAR_Hem123q",
    parent: "Bharatplays",
    status: "ACTIVE",
    cash: 0,
    coins: 0,
    registeredAt: "Tue 02 Jul 2024, 07:02:03",
  },
];

export default function PlayersPage() {
  const [username, setUsername] = useState("");
  const [playerType, setPlayerType] = useState("all");
  const [dateRange, setDateRange] = useState("date");
  const [parent, setParent] = useState("");

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader title="Players" breadcrumbs={["Players"]} />

      <Card className="space-y-4 sm:space-y-5">
        {/* Filters row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-10"
          />
          <Select
            aria-label="Player type"
            value={playerType}
            onChange={setPlayerType}
            options={[
              { label: "All Players", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
            className="h-10"
          />
          <Select
            aria-label="Choose Date"
            value={dateRange}
            onChange={setDateRange}
            options={[
              { label: "Choose Date", value: "date" },
              { label: "Today", value: "today" },
              { label: "Yesterday", value: "yesterday" },
              { label: "Last 7 days", value: "last7" },
            ]}
            className="h-10"
          />
          <Input
            placeholder="Select Parent"
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            className="h-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Filter className="h-4 w-4" aria-hidden />}
            >
              More Filters
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
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="outline" size="sm">
              KYC
            </Button>
            <Button type="button" variant="primary" size="sm">
              Create
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="hidden bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-zinc-500 sm:grid sm:grid-cols-8">
            <span className="col-span-2">Names/Username</span>
            <span>Parent</span>
            <span>Status</span>
            <span>Wallets</span>
            <span>Groups</span>
            <span>Flags</span>
            <span>Registered</span>
          </div>
          {MOCK_PLAYERS.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No players yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {MOCK_PLAYERS.map((row) => (
                <div
                  key={row.id}
                  className="px-4 py-3 text-sm text-zinc-800 sm:grid sm:grid-cols-8 sm:items-center sm:gap-2"
                >
                  <div className="col-span-2 space-y-0.5">
                    <div className="font-medium text-zinc-900">{row.name}</div>
                    <button
                      type="button"
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      {row.username}
                    </button>
                  </div>
                  <div className="hidden text-sm text-zinc-700 sm:block">
                    {row.parent}
                  </div>
                  <div className="mt-1 sm:mt-0">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        row.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-700 sm:mt-0">
                    <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5">
                      <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Cash
                      </span>
                      <span className="tabular-nums">{row.cash}</span>
                    </span>
                    <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5">
                      <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Coins
                      </span>
                      <span className="tabular-nums">{row.coins}</span>
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-zinc-500 sm:mt-0">
                    —
                  </div>
                  <div className="mt-2 text-xs text-zinc-500 sm:mt-0">
                    —
                  </div>
                  <div className="mt-2 text-xs text-zinc-700 sm:mt-0">
                    {row.registeredAt}
                    <div className="text-[11px] text-zinc-400">signup</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

