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
      className={`flex flex-wrap items-center gap-3 rounded-lg bg-neutral-200 px-5 py-4 sm:gap-4 ${className}`}
    >
      {children}
    </div>
  );
}
