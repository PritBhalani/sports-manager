"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageHeader, ListPageFrame } from "@/components";
import { b2cTxKindDwTypeFromSlug } from "@/utils/b2cTransactionRoutes";
import B2cTransactionsClient from "../B2cTransactionsClient";

function TxReportFallback() {
  return (
    <div className="min-w-0 space-y-4">
      <PageHeader title="B2C transactions" breadcrumbs={["Reports", "B2C Summary"]} />
      <ListPageFrame>
        <p className="p-4 text-sm text-muted">Loading…</p>
      </ListPageFrame>
    </div>
  );
}

function InvalidReportSegment({ segment }: { segment: string }) {
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
          Unknown report type
          {segment ? ` “${segment}”` : ""}. Open this report from the B2C Summary table, or use a
          path such as{" "}
          <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">…/transactions/deposit</code>
          .
        </p>
      </ListPageFrame>
    </div>
  );
}

export default function B2cSummaryTransactionsReportPage() {
  const params = useParams();
  const raw = params?.report;
  const segment = Array.isArray(raw) ? raw[0] : raw;
  const report = typeof segment === "string" ? segment : "";
  const parsed = b2cTxKindDwTypeFromSlug(report);

  if (!parsed) {
    return <InvalidReportSegment segment={report} />;
  }

  return (
    <Suspense fallback={<TxReportFallback />}>
      <B2cTransactionsClient kind={parsed.kind} dwType={parsed.dwType} />
    </Suspense>
  );
}
