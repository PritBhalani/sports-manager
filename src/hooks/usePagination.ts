"use client";

import { useState, useCallback } from "react";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/utils/constants";

export type UsePaginationOptions = {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
};

export type UsePaginationReturn = {
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  pageSizeOptions: number[];
  /** Call when filters change to reset to page 1 */
  resetToFirstPage: () => void;
};

export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = DEFAULT_PAGE_SIZE,
    pageSizeOptions = [...PAGE_SIZE_OPTIONS],
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const setPageSizeAndReset = useCallback((s: number) => {
    setPageSize(s);
    setPage(1);
  }, []);

  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const resetToFirstPage = useCallback(() => setPage(1), []);

  return {
    page,
    pageSize,
    setPage,
    setPageSize: setPageSizeAndReset,
    nextPage,
    prevPage,
    pageSizeOptions,
    resetToFirstPage,
  };
}
