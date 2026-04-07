"use client";

import { type ReactNode } from "react";

const tableBase = "min-w-full border-collapse";

export function Table({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="overflow-x-auto border border-border bg-surface">
      <table className={`${tableBase} ${className}`}>{children}</table>
    </div>
  );
}

export function TableHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  /** Applied to the header row (e.g. `bg-surface` for a white header bar). */
  className?: string;
}) {
  return (
    <thead>
      <tr
        className={`border-b border-border ${className || "bg-surface-2"}`}
      >
        {children}
      </tr>
    </thead>
  );
}

export function TableHead({
  children,
  className = "",
  align = "left",
  colSpan,
  rowSpan,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  colSpan?: number;
  rowSpan?: number;
}) {
  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={`px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-foreground-tertiary ${alignClass} ${className}`}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TableRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={`bg-surface transition-colors hover:bg-surface-muted ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className = "",
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";
  return (
    <td
      className={`px-5 py-4 text-sm text-foreground ${alignClass} ${className}`}
    >
      {children}
    </td>
  );
}

export function TableEmpty({
  colSpan,
  message = "No data yet!",
}: {
  colSpan: number;
  message?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-5 py-14 text-center text-sm text-muted"
      >
        {message}
      </td>
    </tr>
  );
}
