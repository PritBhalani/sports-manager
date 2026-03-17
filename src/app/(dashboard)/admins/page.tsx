"use client";

import { useState } from "react";
import { PageHeader, Card, Button, Input, Select } from "@/components";
import { Download } from "lucide-react";

type AdminRow = {
  id: string;
  name: string;
  username: string;
  role: string;
  status: "ACTIVE" | "BLOCKED";
  parent: string;
  cash: number;
  coins: number;
  createdAt: string;
};

const MOCK_ADMINS: AdminRow[] = [
  {
    id: "1",
    name: "Nimala Shiva Krishna",
    username: "Bhaffnimala",
    role: "Affiliate",
    status: "ACTIVE",
    parent: "Bharatplays",
    cash: 0,
    coins: 0,
    createdAt: "Wed 17 Apr 2024, 17:45:26",
  },
  {
    id: "2",
    name: "Prashant",
    username: "Bhaffisai",
    role: "Affiliate",
    status: "BLOCKED",
    parent: "Bharatplays",
    cash: 0,
    coins: 0,
    createdAt: "Tue 02 Apr 2024, 19:44:43",
  },
];

export default function AdminsPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader title="Admins" breadcrumbs={["Admins"]} />

      <Card className="space-y-4 sm:space-y-5">
        {/* Filters row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10"
          />
          <Select
            aria-label="Role filter"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={[
              { label: "Select a Role", value: "all" },
              { label: "Affiliate", value: "affiliate" },
              { label: "Master", value: "master" },
              { label: "Admin", value: "admin" },
            ]}
            className="h-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Download className="h-4 w-4" aria-hidden />}
            >
              Export
            </Button>
            <Button type="button" variant="primary" size="sm">
              Create
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="hidden bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-zinc-500 sm:grid sm:grid-cols-8">
            <span className="col-span-2">Names</span>
            <span>Username</span>
            <span>Role</span>
            <span>Status</span>
            <span>Parent</span>
            <span>Wallets</span>
            <span>Created</span>
          </div>
          {MOCK_ADMINS.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No admins yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {MOCK_ADMINS.map((row) => (
                <div
                  key={row.id}
                  className="px-4 py-3 text-sm text-zinc-800 sm:grid sm:grid-cols-8 sm:items-center sm:gap-2"
                >
                  <div className="col-span-2 text-sm font-medium text-zinc-900">
                    {row.name}
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    {row.username}
                  </button>
                  <div className="text-sm text-zinc-700">{row.role}</div>
                  <div>
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
                  <div className="text-sm text-zinc-700">{row.parent}</div>
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
                  <div className="mt-2 text-xs text-zinc-700 sm:mt-0">
                    {row.createdAt}
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

