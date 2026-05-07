"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Flag } from "lucide-react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  Button,
  Input,
  Select,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components";

// ─── Static sample data (matches screenshot) ────────────────────────────────

const STATIC_FLAGS = [
  {
    id: "1",
    name: "same_kyc",
    type: "fraud",
    level: "high",
    color: "#dc2626",
    createdBy: "",
    createdAt: "Sat 15 Nov 2025, 07:48:36",
  },
  {
    id: "2",
    name: "same_ip",
    type: "fraud",
    level: "high",
    color: "#dc2626",
    createdBy: "",
    createdAt: "Wed 02 Oct 2024, 00:44:31",
  },
  {
    id: "3",
    name: "same_bank",
    type: "fraud",
    level: "high",
    color: "#dc2626",
    createdBy: "",
    createdAt: "Wed 02 Oct 2024, 00:44:31",
  },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "fraud", label: "Fraud" },
  { value: "risk", label: "Risk" },
  { value: "compliance", label: "Compliance" },
];

const LEVEL_OPTIONS = [
  { value: "", label: "All Levels" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function FlagsPage() {
  const router = useRouter();
  const [nameFilter, setNameFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Client-side filter on static data
  const filtered = STATIC_FLAGS.filter((f) => {
    if (nameFilter && !f.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
    if (typeFilter && f.type !== typeFilter) return false;
    if (levelFilter && f.level !== levelFilter) return false;
    return true;
  });

  const totalItems = filtered.length;
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Flags"
        breadcrumbs={["Flags"]}
        action={
          <Link href="/flags/create">
            <Button variant="primary" size="md">
              Create
            </Button>
          </Link>
        }
      />

      {/* ── List card ── */}
      <ListPageFrame>
        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-end gap-3 border-b border-border bg-surface px-5 py-4">
          <div className="w-full max-w-[160px]">
            <Input
              id="flag-name-filter"
              placeholder="Name"
              value={nameFilter}
              onChange={(e) => {
                setNameFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-full max-w-[160px]">
            <Select
              id="flag-type-filter"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              options={TYPE_OPTIONS.filter((o) => o.value !== "")}
              placeholder="All Types"
            />
          </div>

          <div className="w-full max-w-[160px]">
            <Select
              id="flag-level-filter"
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setPage(1);
              }}
              options={LEVEL_OPTIONS.filter((o) => o.value !== "")}
              placeholder="All Levels"
            />
          </div>
        </div>

        {/* ── Table ── */}
        <ListTableSection>
          <Table className="w-full">
            <TableHeader className="bg-surface">
              <TableHead className="!px-6 !py-3 !text-left">NAME</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">TYPE</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">LEVEL</TableHead>
              <TableHead className="!px-6 !py-3 !text-center">COLOR</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">CREATED BY</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">CREATED AT</TableHead>
            </TableHeader>

            <TableBody>
              {pageRows.length === 0 ? (
                <TableEmpty colSpan={6} message="No flags found." />
              ) : (
                pageRows.map((row) => (
                  <TableRow 
                    key={row.id} 
                    className="hover:!bg-surface-muted cursor-pointer"
                    onClick={() => router.push(`/flags/${row.id}`)}
                  >
                    <TableCell className="!px-6 !py-3 font-medium text-foreground">
                      {row.name}
                    </TableCell>
                    <TableCell className="!px-6 !py-3 text-foreground-secondary">
                      {row.type}
                    </TableCell>
                    <TableCell className="!px-6 !py-3 text-foreground-secondary">
                      {row.level}
                    </TableCell>
                    {/* COLOR — filled flag icon in the flag's colour */}
                    <TableCell className="!px-6 !py-3 text-center">
                      <Flag
                        className="inline-block h-4 w-4"
                        style={{ color: row.color, fill: row.color }}
                      />
                    </TableCell>
                    <TableCell className="!px-6 !py-3 text-foreground-secondary">
                      {row.createdBy || "—"}
                    </TableCell>
                    <TableCell className="!px-6 !py-3 text-foreground-secondary">
                      {row.createdAt}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ListTableSection>

        {/* ── Pagination ── */}
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPage(1);
            setPageSize(s);
          }}
          pageSizeOptions={[15, 50, 100]}
        />
      </ListPageFrame>
    </div>
  );
}
