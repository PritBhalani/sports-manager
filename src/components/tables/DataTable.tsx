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
    <div className="overflow-x-auto rounded-sm border border-border bg-surface">
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
        className={`border-b border-border ${className || "bg-surface-muted/80"}`}
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
    <th
      className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-foreground-tertiary sm:px-5 sm:py-4 ${alignClass} ${className}`}
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
      className={`bg-surface transition-colors hover:bg-surface-muted/80 even:bg-surface-muted/50 ${className}`}
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
      className={`px-4 py-3 text-sm text-foreground ${alignClass} ${className}`}
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
