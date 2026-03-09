"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, Button, Input } from "@/components";
import { getReferralSetting, updateReferralSetting } from "@/services/user.service";
import { CURRENT_USER_ID } from "@/utils/constants";

export default function ReferralSettingsPage() {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState({
    bonus: "",
    lockingDays: "",
    minDeposit: "",
    minWithdrawalAmount: "",
    minimumBalanceRequired: "",
    applyAll: false,
  });

  useEffect(() => {
    getReferralSetting(CURRENT_USER_ID)
      .then((res) => {
        setData(res ?? {});
        setForm({
          bonus: String(res?.bonus ?? ""),
          lockingDays: String(res?.lockingDays ?? ""),
          minDeposit: String(res?.minDeposit ?? ""),
          minWithdrawalAmount: String(res?.minWithdrawalAmount ?? ""),
          minimumBalanceRequired: String(res?.minimumBalanceRequired ?? ""),
          applyAll: Boolean(res?.applyAll),
        });
      })
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateReferralSetting({
        userId: CURRENT_USER_ID,
        applyAll: form.applyAll,
        bonus: form.bonus ? Number(form.bonus) : undefined,
        lockingDays: form.lockingDays ? Number(form.lockingDays) : undefined,
        minDeposit: form.minDeposit ? Number(form.minDeposit) : undefined,
        minWithdrawalAmount: form.minWithdrawalAmount ? Number(form.minWithdrawalAmount) : undefined,
        minimumBalanceRequired: form.minimumBalanceRequired ? Number(form.minimumBalanceRequired) : undefined,
      });
      setMessage({ type: "success", text: "Referral settings updated." });
    } catch {
      setMessage({ type: "error", text: "Failed to update." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Referral Settings"
        breadcrumbs={["Settings", "Referral"]}
        description="Referral settings for your account (GET/POST /user/getreferralsetting, updatereferralsetting)"
      />
      <Card title="Referral settings" className="max-w-lg">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {message && (
              <p
                className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}
              >
                {message.text}
              </p>
            )}
            <Input
              label="Bonus"
              type="number"
              value={form.bonus}
              onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))}
            />
            <Input
              label="Locking days"
              type="number"
              value={form.lockingDays}
              onChange={(e) => setForm((f) => ({ ...f, lockingDays: e.target.value }))}
            />
            <Input
              label="Min deposit"
              type="number"
              value={form.minDeposit}
              onChange={(e) => setForm((f) => ({ ...f, minDeposit: e.target.value }))}
            />
            <Input
              label="Min withdrawal amount"
              type="number"
              value={form.minWithdrawalAmount}
              onChange={(e) => setForm((f) => ({ ...f, minWithdrawalAmount: e.target.value }))}
            />
            <Input
              label="Minimum balance required"
              type="number"
              value={form.minimumBalanceRequired}
              onChange={(e) => setForm((f) => ({ ...f, minimumBalanceRequired: e.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.applyAll}
                onChange={(e) => setForm((f) => ({ ...f, applyAll: e.target.checked }))}
                className="rounded border-zinc-300"
              />
              Apply to all
            </label>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
