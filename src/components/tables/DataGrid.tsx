"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components";

export type DataGridColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  align?: "left" | "center" | "right";
};

type SortDirection = "asc" | "desc";

export type DataGridProps<T extends Record<string, unknown>> = {
  columns: DataGridColumn<T>[];
  rows: T[];
  getRowId?: (row: T, index: number) => string;
  enableSearch?: boolean;
  searchPlaceholder?: string;
  getSearchText?: (row: T) => string;
  initialSortColumnId?: string;
  initialSortDirection?: SortDirection;
  pageSizeOptions?: readonly number[] | number[];
  initialPageSize?: number;
  emptyMessage?: string;
};

type SortState = {
  columnId: string;
  direction: SortDirection;
} | null;

export default function DataGrid<T extends Record<string, unknown>>({
  columns,
  rows,
  getRowId,
  enableSearch = true,
  searchPlaceholder = "Search…",
  getSearchText,
  initialSortColumnId,
  initialSortDirection = "asc",
  pageSizeOptions = [10, 15, 25, 50],
  initialPageSize = 15,
  emptyMessage = "No data yet.",
}: DataGridProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState<SortState>(
    initialSortColumnId
      ? { columnId: initialSortColumnId, direction: initialSortDirection }
      : null
  );

  const debouncedSetSearch = useDebouncedCallback((value: unknown) => {
    const text = typeof value === "string" ? value : String(value ?? "");
    setSearch(text);
    setPage(1);
  }, 300);

  const effectiveGetSearchText =
    getSearchText ??
    ((row: T) => {
      try {
        return JSON.stringify(row).toLowerCase();
      } catch {
        return "";
      }
    });

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => effectiveGetSearchText(row).includes(term));
  }, [rows, search, effectiveGetSearchText]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col || !col.sortable) return filteredRows;
    const getValue =
      col.sortValue ??
      ((row: T) => {
        const cell = col.cell(row);
        return typeof cell === "string" || typeof cell === "number"
          ? cell
          : String(cell ?? "");
      });
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va == null && vb == null) return 0;
      if (va == null) return -1 * dir;
      if (vb == null) return 1 * dir;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filteredRows, columns, sort]);

  const totalItems = sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = sortedRows.slice(start, start + pageSize);

  const handleHeaderClick = (column: DataGridColumn<T>) => {
    if (!column.sortable) return;
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.columnId !== column.id) {
        return { columnId: column.id, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { columnId: column.id, direction: "desc" };
      }
      return null;
    });
  };

  const resolveRowId = (row: T, index: number) =>
    getRowId ? getRowId(row, index) : String((row as any)?.id ?? index);

  return (
    <div className="space-y-4 sm:space-y-5">
      {enableSearch && (
        <div className="rounded-lg bg-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-white px-3 py-2.5">
            <Search className="h-4 w-4 text-placeholder" aria-hidden />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="h-6 w-full bg-transparent text-sm text-foreground placeholder:text-placeholder focus:outline-none"
              onChange={(e) => debouncedSetSearch(e.target.value)}
            />
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          {columns.map((col) => {
            const isActive = sort?.columnId === col.id;
            const direction = sort?.direction ?? "asc";
            return (
              <TableHead
                key={col.id}
                align={col.align}
                className={col.sortable ? "cursor-pointer select-none" : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={col.sortable ? () => handleHeaderClick(col) : undefined}
                  >
                    {col.header}
                    {col.sortable && (
                      <span aria-hidden className="text-[10px] text-placeholder">
                        {isActive ? (direction === "asc" ? "▲" : "▼") : "⇵"}
                      </span>
                    )}
                  </button>
                </span>
              </TableHead>
            );
          })}
        </TableHeader>
        <TableBody>
          {totalItems === 0 ? (
            <TableEmpty colSpan={columns.length} message={emptyMessage} />
          ) : (
            pageRows.map((row, index) => {
              const key = resolveRowId(row, start + index);
              return (
                <TableRow key={key} className="hover:bg-surface-muted">
                  {columns.map((col) => (
                    <TableCell key={col.id} align={col.align}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <TablePagination
        page={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          if (!size) return;
          setPageSize(size);
          setPage(1);
        }}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  );
}

