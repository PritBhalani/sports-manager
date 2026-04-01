"use client";

import { type ReactNode } from "react";

export type ListFilterPanelProps = {
  children: ReactNode;
  className?: string;
  /** Optional mobile-only "Show Filters" button */
  mobileToggle?: {
    label?: string;
    onClick: () => void;
  };
};

/**
 * Deposit/Withdraw style filter strip wrapper.
 * Put your grid inputs + action buttons inside `children`.
 */
export default function ListFilterPanel({ children, className = "", mobileToggle }: ListFilterPanelProps) {
  return (
    <section className={className}>
      <div className="bg-neutral-200 py-5 sm:py-0">
        {mobileToggle ? (
          <div className="flex justify-center sm:hidden">
            <button
              type="button"
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white"
              onClick={mobileToggle.onClick}
            >
              {mobileToggle.label ?? "Show Filters"}
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

