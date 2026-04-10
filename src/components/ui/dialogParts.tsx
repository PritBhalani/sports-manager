"use client";

import type { ReactNode } from "react";

/** Default scrollable body — matches deposit / withdraw request modals. */
export const DIALOG_BODY_DEFAULT = "space-y-5 p-4 sm:p-5";

/** Smaller confirms (rollback, delete, lock). */
export const DIALOG_BODY_COMPACT = "space-y-4 p-4 sm:p-5";

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

/** Footer actions: primary first (Save / Proceed / Create), dismiss second (Cancel / Close). */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}

/** Inner card chrome (summary / detail blocks inside large modals). */
export function DialogPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg border border-border bg-surface-2/60 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function DialogPanelHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-border px-4 py-3 sm:px-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
        {title}
      </h3>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}

export function DialogPanelBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-4 pb-4 pt-1 sm:px-5 ${className}`}>{children}</div>;
}
