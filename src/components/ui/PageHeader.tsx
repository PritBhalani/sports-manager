"use client";

import { type ReactNode } from "react";

export type PageHeaderProps = {
  title: string;
  breadcrumbs?: string[];
  description?: string;
  action?: ReactNode;
};

export default function PageHeader({
  title,
  breadcrumbs,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-4 flex min-w-0 flex-col gap-1 sm:mb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold text-zinc-900 sm:text-2xl">
          {title}
        </h1>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <p className="mt-0.5 text-sm text-zinc-500">
            {breadcrumbs.join(" / ")}
          </p>
        )}
        {description && !breadcrumbs?.length && (
          <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0">{action}</div>}
    </div>
  );
}
