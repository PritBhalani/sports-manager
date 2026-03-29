"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card } from "@/components";
import { Copy, Check } from "lucide-react";
import { getReferralSetting, getSessionMemberId } from "@/services/user.service";
import {
  buildReferralShareLink,
  extractReferralCode,
  getReferralCodeFromSession,
  unwrapRecordPayload,
} from "@/utils/referralCode";

function CopyRow({
  label,
  value,
  emptyText = "—",
}: {
  label: string;
  value: string | undefined;
  emptyText?: string;
}) {
  const [copied, setCopied] = useState(false);
  const display = value?.trim() ? value : emptyText;
  const canCopy = Boolean(value?.trim());

  const handleCopy = useCallback(() => {
    if (!canCopy) return;
    navigator.clipboard.writeText(value!.trim()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [canCopy, value]);

  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="shrink-0 text-sm font-medium text-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span
          className={`min-w-0 truncate text-right text-sm ${
            canCopy ? "text-foreground" : "text-placeholder"
          }`}
          title={canCopy ? value : undefined}
        >
          {display}
        </span>
        {canCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-primary transition-colors hover:bg-info-subtle"
            aria-label={`Copy ${label}`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState<string | undefined>(() =>
    getReferralCodeFromSession(),
  );
  const [loadingApi, setLoadingApi] = useState(true);

  useEffect(() => {
    const userId = getSessionMemberId();
    if (!userId) {
      setLoadingApi(false);
      return;
    }
    getReferralSetting(userId)
      .then((raw) => {
        const payload = unwrapRecordPayload(raw) ?? {};
        const fromApi = extractReferralCode(payload);
        setReferralCode((prev) => prev ?? fromApi);
      })
      .catch(() => {
        /* session code still shown if present */
      })
      .finally(() => setLoadingApi(false));
  }, []);

  const shareLink =
    referralCode?.trim() ? buildReferralShareLink(referralCode.trim()) : undefined;

  return (
    <div className="min-w-0">
      <PageHeader title="Referrals" breadcrumbs={["Referrals"]} />
      <Card title="Reference information" className="max-w-xl">
        {loadingApi && !referralCode?.trim() ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (
          <div className="flex flex-col">
            <CopyRow label="Referral link" value={shareLink} emptyText="Not available" />
            <CopyRow label="Referral code" value={referralCode} emptyText="Not available" />
          </div>
        )}
      </Card>
    </div>
  );
}
