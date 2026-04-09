"use client";

import type { ReactNode } from "react";

export function DialogSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
      {children}
    </section>
  );
}

export function DialogFormRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{children}</div>;
}

/** Footer actions: put primary first (Save / Proceed / Create), dismiss second (Cancel / Close). */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-2">{children}</div>;
}
