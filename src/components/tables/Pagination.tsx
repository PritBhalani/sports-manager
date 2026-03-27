"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Select from "@/components/forms/Select";
import { PAGE_SIZE_OPTIONS } from "@/utils/constants";

export type TablePaginationProps = {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[] | number[];
};

export default function TablePagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [...PAGE_SIZE_OPTIONS],
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-5 py-3.5 sm:px-6">
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <>
            <Select
              options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 w-16 py-0 pl-2 pr-7"
              aria-label="Items per page"
            />
            <span className="text-sm text-foreground-tertiary">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </span>
          </>
        )}
        {!onPageSizeChange && (
          <span className="text-sm text-foreground-tertiary">
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-surface text-foreground-tertiary transition-colors hover:bg-surface-muted disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page)}
          className="flex h-8 min-w-[2rem] items-center justify-center rounded-sm bg-primary px-2 text-sm font-medium text-primary-foreground"
          aria-label={`Page ${page}`}
          aria-current="page"
        >
          {page}
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-surface text-foreground-tertiary transition-colors hover:bg-surface-muted disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
