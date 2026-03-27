"use client";

import { type ReactNode } from "react";

export type CardProps = {
  children: ReactNode;
  title?: string;
  className?: string;
  /**
   * When false, body has no padding or default vertical stack gap (full-bleed layouts).
   * Default: true — consistent spacing between filters, tables, and sections.
   */
  padded?: boolean;
};

export default function Card({
  children,
  title,
  className = "",
  padded = true,
}: CardProps) {
  const body =
    padded === false
      ? "p-0"
      : "space-y-5 p-5 sm:space-y-6 sm:p-6";

  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] ${className}`}
    >
      {title && (
        <div className="border-b border-border px-5 py-3.5 sm:px-6">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
      )}
      <div className={body}>{children}</div>
    </div>
  );
}
