"use client";

import { useState } from "react";
import Link from "next/link";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  Badge,
  Button,
  Input,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableEmpty,
  TablePagination,
} from "@/components";
import { Plus, RefreshCw } from "lucide-react";

// ─── Page ──────────────────────────────────────────────────────────────────

export default function UserGroupsPage() {
  const [title, setTitle] = useState("");

  // Pagination state — kept so the shell is ready for real data wiring later
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setTitle("");
    setPage(1);
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* ── Page header ── */}
      <PageHeader
        title="User Groups"
        breadcrumbs={["User Groups"]}
        action={
          <Link href="/user-groups/create">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create
            </Button>
          </Link>
        }
      />

      {/* ── Card wrapper ── */}
      <ListPageFrame>
        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-end gap-3 border-b border-border bg-surface px-5 py-4">
          <div className="w-full max-w-xs">
            <Input
              id="user-groups-title-filter"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
          </div>

          <Button variant="primary" size="md" onClick={handleSearch}>
            Search
          </Button>

          <Button
            variant="outline"
            size="md"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={handleReset}
            aria-label="Reset filters"
          >
            Reset
          </Button>
        </div>

        {/* ── Table ── */}
        <ListTableSection>
          <Table className="w-full min-w-max">
            <TableHeader className="bg-surface">
              <TableHead className="!px-6 !py-3 !text-left">NAME</TableHead>
              <TableHead className="!px-6 !py-3 !text-center">IMAGE</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">USER TYPE</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">UPDATE TYPE</TableHead>
              <TableHead className="!px-6 !py-3 !text-center">STATUS</TableHead>
              <TableHead className="!px-6 !py-3 !text-left">CREATED AT</TableHead>
            </TableHeader>

            <TableBody>
              {/* No data state — placeholder until API is wired */}
              <TableEmpty colSpan={6} message="No user groups found." />
            </TableBody>
          </Table>
        </ListTableSection>

        {/* ── Pagination ── */}
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalItems={0}
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
