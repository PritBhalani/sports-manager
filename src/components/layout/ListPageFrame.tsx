"use client";

import { type ReactNode } from "react";
import Card from "@/components/ui/Card";

export type ListPageFrameProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Shared "list page" container matching Deposit/Withdraw pages:
 * - no padding Card
 * - rounded-lg white background
 * - overflow-auto (tables can scroll horizontally)
 */
export default function ListPageFrame({ children, className = "" }: ListPageFrameProps) {
  return (
    <Card
      padded={false}
      className={`relative w-full min-w-[14rem] overflow-auto rounded-lg bg-white ${className}`}
    >
      {children}
    </Card>
  );
}

