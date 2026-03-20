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
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className={`${tableBase} ${className}`}>{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-zinc-200 bg-zinc-50/80">
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
      className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600 sm:px-5 sm:py-4 ${alignClass} ${className}`}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-zinc-200">{children}</tbody>;
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
      className={`bg-white transition-colors hover:bg-zinc-50/80 even:bg-zinc-50/50 ${className}`}
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
      className={`px-4 py-3 text-sm text-zinc-900 ${alignClass} ${className}`}
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
        className="px-5 py-14 text-center text-sm text-zinc-500"
      >
        {message}
      </td>
    </tr>
  );
}
