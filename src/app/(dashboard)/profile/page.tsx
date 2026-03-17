"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader, Card, Button, Input, Select } from "@/components";
import {
  User,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Copy,
  Check,
  Calendar,
  Download,
} from "lucide-react";
import {
  getMyInfo,
  updateMember,
  getMyInfoPathId,
  getSessionMemberId,
} from "@/services/user.service";
import type { MyInfo, UpdateMemberBody } from "@/types/user.types";

function formatNow(): string {
  try {
    return new Date().toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return new Date().toISOString();
  }
}

function ProfileFieldRow({
  label,
  value,
  emptyPlaceholder = "—",
  copyable,
  editable,
  onEdit,
  children,
}: {
  label: string;
  value?: string | null;
  emptyPlaceholder?: string;
  copyable?: boolean;
  editable?: boolean;
  onEdit?: () => void;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const display = value?.trim() ? value : emptyPlaceholder;
  const isEmpty = !value?.trim();

  const handleCopy = useCallback(() => {
    if (!value?.trim()) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  return (
    <div className="flex flex-col gap-1 border-b border-zinc-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="shrink-0 text-sm font-medium text-zinc-500">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:justify-end">
        {children ?? (
          <>
            <span
              className={`truncate text-right text-sm ${
                isEmpty ? "text-zinc-400" : "text-zinc-900"
              }`}
            >
              {display}
            </span>
            {copyable && !isEmpty && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                aria-label="Copy"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            )}
            {editable && (
              <button
                type="button"
                onClick={onEdit}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                aria-label={`Edit ${label}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function InlineEditBlock({
  label,
  initialValue,
  onSave,
  onCancel,
  saving,
  type = "text",
}: {
  label: string;
  initialValue: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  saving: boolean;
  type?: string;
}) {
  const [v, setV] = useState(initialValue);
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <Input
        label={label}
        type={type}
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="bg-white"
      />
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={() => onSave(v)}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex justify-between border-b border-zinc-100 py-3">
          <div className="h-4 w-20 rounded bg-zinc-200" />
          <div className="h-4 w-40 rounded bg-zinc-100" />
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const [info, setInfo] = useState<MyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("profile");
  const [now, setNow] = useState(formatNow);
  const [editingField, setEditingField] = useState<
    "name" | "email" | "phone" | "timezone" | null
  >(null);
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Calcutta";
    } catch {
      return "Asia/Calcutta";
    }
  });

  useEffect(() => {
    const t = setInterval(() => setNow(formatNow()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    // README §3 getmyinfo/{parentId} — use parent id from login payload
    const pathId = getMyInfoPathId();
    if (!pathId) {
      setLoading(false);
      setInfo(null);
      setMessage({
        type: "error",
        text: "Session has no parent id. Log out and log in again to load profile.",
      });
      return;
    }
    getMyInfo(pathId)
      .then((res) => {
        if (!cancelled) setInfo(res ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setInfo(null);
          setMessage({
            type: "error",
            text: "Could not load profile. Check session or try logging in again.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveField = async (fields: Partial<UpdateMemberBody>) => {
    setSaving(true);
    setMessage(null);
    try {
      // README §3 POST /user/updatemember — member id + parentId when available
      const memberId = info?.id || getSessionMemberId();
      const body: UpdateMemberBody = {
        ...fields,
        ...(memberId ? { id: memberId } : {}),
      };
      await updateMember(body);
      setInfo((prev) => (prev ? { ...prev, ...fields } : null));
      setMessage({ type: "success", text: "Updated successfully." });
      setEditingField(null);
    } catch {
      setMessage({ type: "error", text: "Update failed. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    {
      id: "profile",
      label: "Profile",
      icon: <User className="h-4 w-4 shrink-0" />,
    },
    {
      id: "account-statement",
      label: "Account Statement",
      icon: <FileText className="h-4 w-4 shrink-0" />,
    },
  ];

  return (
    <div className="min-w-0">
      <PageHeader title="My Profile" breadcrumbs={["Profile"]} />

      {/* Tab bar – blue underline on active (matches reference) */}
      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex gap-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                }`}
                aria-selected={isActive}
                role="tab"
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-6" role="tabpanel">
        {activeTab === "account-statement" && (
          <div className="space-y-4">
            {/* Totals strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-medium text-zinc-700">
                  Total Debit:{" "}
                  <span className="font-semibold text-red-600">10,302,053</span>
                </span>
                <span className="font-medium text-zinc-700">
                  Total Credit:{" "}
                  <span className="font-semibold text-emerald-600">
                    10,445,818.06
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  aria-label="Time range"
                  value="all"
                  onChange={() => {}}
                  options={[
                    { label: "All Time", value: "all" },
                    { label: "Today", value: "today" },
                    { label: "Yesterday", value: "yesterday" },
                  ]}
                  className="h-9 min-w-[120px]"
                />
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                >
                  <Calendar className="h-4 w-4" aria-hidden />
                </button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="h-4 w-4" aria-hidden />}
                >
                  Export
                </Button>
              </div>
            </div>

            {/* Statement table mock */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="hidden bg-zinc-50 px-4 py-2.5 text-xs font-semibold text-zinc-500 sm:grid sm:grid-cols-6">
                <span className="col-span-2">Narration</span>
                <span>Debit</span>
                <span>Credit</span>
                <span>Balance</span>
                <span>Date</span>
              </div>
              <div className="divide-y divide-zinc-100">
                <div className="px-4 py-3 text-sm text-zinc-800 sm:grid sm:grid-cols-6 sm:items-center sm:gap-3">
                  <div className="col-span-2">
                    <p className="text-sm text-zinc-800">
                      Withdrawal request of 2000 approved for Cbtc1 | 92SVSLGWP1LFP22V |
                      Comment: 4151
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-red-600 sm:mt-0">0</div>
                  <div className="mt-2 sm:mt-0">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      2,000
                    </span>
                  </div>
                  <div className="mt-2 text-xs tabular-nums text-zinc-800 sm:mt-0">
                    143,766
                  </div>
                  <div className="mt-2 text-xs text-zinc-700 sm:mt-0">
                    Sat 15 Jun 2024, 17:37:58
                  </div>
                </div>
                <div className="px-4 py-3 text-sm text-zinc-800 sm:grid sm:grid-cols-6 sm:items-center sm:gap-3">
                  <div className="col-span-2">
                    <p className="text-sm text-zinc-800">
                      Withdrawal request of 8000 approved for Cbtc1 | 11YPXI6USPX3IU3 |
                      Comment: 0889
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-red-600 sm:mt-0">0</div>
                  <div className="mt-2 sm:mt-0">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      8,000
                    </span>
                  </div>
                  <div className="mt-2 text-xs tabular-nums text-zinc-800 sm:mt-0">
                    141,766
                  </div>
                  <div className="mt-2 text-xs text-zinc-700 sm:mt-0">
                    Sat 15 Jun 2024, 17:06:10
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="flex flex-col gap-6">
            {loading && (
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 p-6 shadow-sm">
                <ProfileSkeleton />
              </div>
            )}
            {!loading && message && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
                role="alert"
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {!loading && (
            <>
            {/* Main profile card – light grey container, two columns */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm">
              <div className="grid gap-0 p-4 sm:grid-cols-2 sm:gap-6 sm:p-6">
                {/* Left column */}
                <div className="space-y-0 border-zinc-100 sm:border-r sm:pr-6">
                  {editingField === "name" ? (
                    <div className="py-3">
                      <InlineEditBlock
                        label="Name"
                        initialValue={info?.name ?? ""}
                        saving={saving}
                        onSave={(name) => handleSaveField({ name })}
                        onCancel={() => setEditingField(null)}
                      />
                    </div>
                  ) : (
                    <ProfileFieldRow
                      label="Name"
                      value={info?.name || info?.username}
                      editable={!loading}
                      onEdit={() => setEditingField("name")}
                    />
                  )}

                  <ProfileFieldRow
                    label="Username"
                    value={info?.username}
                    copyable={Boolean(info?.username?.trim())}
                  />

                  {editingField === "phone" ? (
                    <div className="py-3">
                      <InlineEditBlock
                        label="Phone"
                        initialValue={info?.phone ?? ""}
                        saving={saving}
                        onSave={(phone) => handleSaveField({ phone })}
                        onCancel={() => setEditingField(null)}
                      />
                    </div>
                  ) : (
                    <ProfileFieldRow
                      label="Phone"
                      value={info?.phone}
                      emptyPlaceholder=""
                      editable={!loading}
                      onEdit={() => setEditingField("phone")}
                    />
                  )}

                  <div className="flex flex-col gap-1 border-b border-zinc-100 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-zinc-500">
                      Password Auto
                    </span>
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full bg-red-600 hover:bg-red-700 sm:w-auto"
                      onClick={() =>
                        setMessage({
                          type: "success",
                          text: "If your backend exposes this action, wire it here.",
                        })
                      }
                    >
                      Generate and Email new Password
                    </Button>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-0 sm:pl-0">
                  {editingField === "email" ? (
                    <div className="py-3">
                      <InlineEditBlock
                        label="Email"
                        type="email"
                        initialValue={info?.email ?? ""}
                        saving={saving}
                        onSave={(email) => handleSaveField({ email })}
                        onCancel={() => setEditingField(null)}
                      />
                    </div>
                  ) : (
                    <ProfileFieldRow
                      label="Email"
                      value={info?.email}
                      editable={!loading}
                      onEdit={() => setEditingField("email")}
                    />
                  )}

                  <ProfileFieldRow label="Role" value={info?.role || "—"} editable={false} />

                  <ProfileFieldRow
                    label="Password"
                    value="********"
                    editable
                    onEdit={() =>
                      setMessage({
                        type: "success",
                        text: "Password change can be wired to your API when available.",
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Date/time line */}
            <p className="text-sm text-zinc-700">{now}</p>

            {/* Time zone card */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm">
              <div className="p-4 sm:p-6">
                <h3 className="mb-3 text-sm font-semibold text-zinc-900">Time</h3>
                {editingField === "timezone" ? (
                  <div className="rounded-lg border border-zinc-200 bg-white p-3">
                    <Input
                      label="Time Zone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      placeholder="e.g. Asia/Calcutta"
                      className="bg-white"
                    />
                    <div className="mt-3 flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setEditingField(null);
                          setMessage({
                            type: "success",
                            text: "Time zone saved locally. Persist via API if supported.",
                          });
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingField(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ProfileFieldRow
                    label="Time Zone"
                    value={timezone}
                    editable
                    onEdit={() => setEditingField("timezone")}
                  />
                )}
              </div>
            </div>
            </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
