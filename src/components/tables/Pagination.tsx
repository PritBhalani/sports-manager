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
  const clampedPage = Math.min(Math.max(1, page), totalPages);

  const getPages = (): Array<number | "..."> => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: Array<number | "..."> = [1];
    const start = Math.max(2, clampedPage - 2);
    const end = Math.min(totalPages - 1, clampedPage + 2);
    if (start > 2) pages.push("...");
    for (let p = start; p <= end; p += 1) pages.push(p);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const pages = getPages();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-2.5 sm:px-5">
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <>
            <div className="w-[4.5rem] shrink-0">
              <Select
                options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
                value={String(pageSize)}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                aria-label="Items per page"
              />
            </div>
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
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(clampedPage - 1)}
          disabled={clampedPage <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-foreground-tertiary shadow-sm transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} className="px-1 text-sm text-foreground-tertiary">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === clampedPage ? "page" : undefined}
              className={
                p === clampedPage
                  ? "flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg bg-primary px-2 text-sm font-medium text-primary-foreground shadow-sm"
                  : "flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-gray-200 bg-white px-2 text-sm text-foreground shadow-sm transition-colors hover:bg-gray-50"
              }
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(clampedPage + 1)}
          disabled={clampedPage >= totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-foreground-tertiary shadow-sm transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
