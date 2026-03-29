"use client";

import { PageHeader } from "@/components";

export default function FraudLogsPage() {
  return (
    <div className="min-w-0">
      <PageHeader
        title="Security | Fraud Logs"
        breadcrumbs={["Security", "Fraud Logs"]}
      />
    </div>
  );
}
