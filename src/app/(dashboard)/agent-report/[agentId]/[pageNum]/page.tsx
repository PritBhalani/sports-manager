"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

function LegacyAgentReportRedirect() {
  const router = useRouter();
  const params = useParams<{ agentId?: string; pageNum?: string }>();
  const searchParams = useSearchParams();
  const agentId = String(params?.agentId ?? "").trim();
  const pageNum = String(params?.pageNum ?? "1").trim();

  useEffect(() => {
    if (!agentId) return;
    const p = Math.max(1, Number.parseInt(pageNum, 10) || 1);
    const sp = new URLSearchParams(searchParams.toString());
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const qs = sp.toString();
    router.replace(
      `/reports/pl-by-agent/${encodeURIComponent(agentId)}/0${qs ? `?${qs}` : ""}`,
    );
  }, [agentId, pageNum, router, searchParams]);

  if (!agentId) {
    return (
      <div className="min-w-0 space-y-4 px-4 py-6">
        <p className="text-sm text-error" role="alert">
          Missing agent id. Use{" "}
          <code className="rounded bg-surface-muted px-1">
            /reports/pl-by-agent/&#123;agentId&#125;/&#123;userType&#125;?page=…
          </code>
          .
        </p>
      </div>
    );
  }

  return <div className="px-4 py-8 text-sm text-muted">Redirecting…</div>;
}

export default function LegacyAgentReportPage() {
  return (
    <Suspense fallback={<div className="px-4 py-8 text-sm text-muted">Loading…</div>}>
      <LegacyAgentReportRedirect />
    </Suspense>
  );
}
