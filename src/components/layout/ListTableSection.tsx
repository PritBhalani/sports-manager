"use client";

import { type ReactNode } from "react";

export type ListTableSectionProps = {
  children: ReactNode;
  className?: string;
};

/** Deposit/Withdraw style table area wrapper (light grey background, scroll). */
export default function ListTableSection({ children, className = "" }: ListTableSectionProps) {
  return <div className={`relative overflow-auto bg-surface-muted ${className}`}>{children}</div>;
}

