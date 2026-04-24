"use client";

import { Suspense, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader, ListPageFrame } from "@/components";
import { legacyB2cTransactionsUrlFromSearchParams } from "@/utils/b2cTransactionRoutes";

function LegacyTransactionsRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qs = searchParams.toString();
  const target = useMemo(
    () => legacyB2cTransactionsUrlFromSearchParams(new URLSearchParams(qs)),
    [qs],
  );

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (target) {
    return (
      <div className="min-w-0 space-y-4">
        <PageHeader title="B2C transactions" breadcrumbs={["Reports", "B2C Summary"]} />
        <ListPageFrame>
          <p className="p-4 text-sm text-muted">Redirecting…</p>
        </ListPageFrame>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="B2C transactions"
        breadcrumbs={["Reports", "B2C Summary", "Transactions"]}
        action={
          <Link
            href="/reports/b2c-summary"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-foreground-secondary hover:bg-surface-muted"
          >
            Back to B2C Summary
          </Link>
        }
      />
      <ListPageFrame>
        <p className="p-4 text-sm text-error" role="alert">
          Invalid or incomplete link. Open this report from the B2C Summary table (deposit,
          withdrawal, or bonus amounts). New URLs look like
          <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
            /reports/b2c-summary/transactions/deposit?…
          </code>
          .
        </p>
      </ListPageFrame>
    </div>
  );
}

export default function B2cSummaryTransactionsLegacyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-w-0 space-y-4">
          <PageHeader title="B2C transactions" breadcrumbs={["Reports", "B2C Summary"]} />
          <ListPageFrame>
            <p className="p-4 text-sm text-muted">Loading…</p>
          </ListPageFrame>
        </div>
      }
    >
      <LegacyTransactionsRedirect />
    </Suspense>
  );
}
