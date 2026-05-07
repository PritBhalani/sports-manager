"use client";

import { use, useState } from "react";
import { Flag, Trash2 } from "lucide-react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
  Input,
  Select,
  Card,
} from "@/components";

// ─── Static sample data ─────────────────────────────────────────────────────

const STATIC_FLAG_DETAIL = {
  id: "same_kyc",
  name: "same_kyc",
  type: "fraud",
  level: "high",
  color: "#dc2626",
  createdBy: "",
  createdAt: "2025-11-15 07:48:36",
  description: "",
};

const SAMPLE_PLAYERS = [
  // Empty for now as per screenshot "0 items"
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "default", label: "Default" },
  { value: "fraud", label: "Fraud" },
  { value: "custom", label: "Custom" },
];

const LEVEL_OPTIONS = [
  { value: "", label: "All Levels" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function FlagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Flags"
        breadcrumbs={["Flags", id]}
      />

      {/* ── Summary Card (Top Section) ── */}
      <div className="rounded-lg border border-border bg-surface shadow-sm overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b border-border">
              <td className="w-1/10  px-4 py-3 font-semibold text-foreground border-r border-border">Flag</td>
              <td className="w-1/4 px-4 py-3 text-foreground-secondary">{STATIC_FLAG_DETAIL.name}</td>
              <td className="w-1/10  px-4 py-3 font-semibold text-foreground border-l border-r border-border">Color</td>
              <td className="w-1/4 px-4 py-3 text-foreground-secondary">
                <Flag className="h-4 w-4" style={{ color: STATIC_FLAG_DETAIL.color, fill: STATIC_FLAG_DETAIL.color }} />
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="w-1/10  px-4 py-3 font-semibold text-foreground border-r border-border">Type</td>
              <td className="w-1/4 px-4 py-3 text-foreground-secondary">{STATIC_FLAG_DETAIL.type}</td>
              <td className="w-1/10  px-4 py-3 font-semibold text-foreground border-l border-r border-border">Level</td>
              <td className="w-1/4 px-4 py-3 text-foreground-secondary">{STATIC_FLAG_DETAIL.level}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="w-1/10  px-4 py-3 font-semibold text-foreground border-r border-border">Created At</td>
              <td className="w-1/4 px-4 py-3 text-foreground-secondary">{STATIC_FLAG_DETAIL.createdAt}</td>
              <td className="w-1/10  px-4 py-3 font-semibold text-foreground border-l border-r border-border">Created By</td>
              <td className="w-1/4 px-4 py-3 text-foreground-secondary">{STATIC_FLAG_DETAIL.createdBy || "—"}</td>
            </tr>
            <tr>
              <td className="w-1/10  px-4 py-3 font-semibold text-foreground border-r border-border">Description</td>
              <td colSpan={3} className="px-4 py-3 text-foreground-secondary">{STATIC_FLAG_DETAIL.description || "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Players List Section (Bottom Section) ── */}
      <ListPageFrame>
        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3 border-b border-border bg-surface px-5 py-4">
          <div className="w-full max-w-[160px]">
            <Input id="player-name" placeholder="Player Name" />
          </div>
          <div className="w-full max-w-[160px]">
            <Input id="flag-name" placeholder="Flag Name" />
          </div>
          <div className="w-full max-w-[160px]">
            <Select id="type" options={TYPE_OPTIONS} placeholder="All Types" />
          </div>
          <div className="w-full max-w-[160px]">
            <Select id="level" options={LEVEL_OPTIONS} placeholder="All Levels" />
          </div>
        </div>

        {/* Table */}
        <ListTableSection>
          <Table className="w-full">
            <TableHeader className="bg-surface">
              <TableHead className="!px-6 !py-3 !text-left">PLAYER</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">NAME</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">TYPE</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">LEVEL</TableHead>
              <TableHead className="!px-6 !py-3 !text-center">COLOR</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">ADDED AT</TableHead>
              <TableHead className="!px-6 !py-3 !text-center">REMOVE</TableHead>
            </TableHeader>

            <TableBody>
              {SAMPLE_PLAYERS.length === 0 ? (
                <TableEmpty colSpan={7} message="No items found." />
              ) : null}
            </TableBody>
          </Table>
        </ListTableSection>

        {/* Pagination */}
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={0}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </ListPageFrame>
    </div>
  );
}
