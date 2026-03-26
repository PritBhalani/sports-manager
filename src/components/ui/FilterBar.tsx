"use client";

import { type ReactNode } from "react";

export type FilterBarProps = {
  children: ReactNode;
  className?: string;
};

/** Wrapper for page filter row: search, selects, date range, Export/Create buttons */
export default function FilterBar({
  children,
  className = "",
}: FilterBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-sm border border-zinc-200 bg-zinc-50/80 p-4 sm:gap-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}
