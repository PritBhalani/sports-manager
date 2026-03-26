"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
} from "react";
import { PageHeader, Button, Input, Modal, TablePagination } from "@/components";
import {
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Copy,
  Check,
  Download,
} from "lucide-react";
import {
  getMyInfo,
  getMyInfoPathId,
  getSessionMemberId,
  getLoginProfileFromSession,
} from "@/services/user.service";
import { getAccountStatement } from "@/services/account.service";
import { changePassword } from "@/services/auth.service";
import type { MyInfo } from "@/types/user.types";
import { dateRangeToISO, todayRangeUTC } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";

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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-blue-600 transition-colors hover:bg-blue-50"
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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-blue-600 transition-colors hover:bg-blue-50"
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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState("profile");
  const [now, setNow] = useState(formatNow);
  const [editingField, setEditingField] = useState<"timezone" | null>(null);
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Calcutta";
    } catch {
      return "Asia/Calcutta";
    }
  });

  // Account statement state (Profile tab)
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [statementRows, setStatementRows] = useState<Record<string, unknown>[]>([]);
  const [statementTotal, setStatementTotal] = useState(0);
  const [statementPage, setStatementPage] = useState(1);
  const [statementPageSize, setStatementPageSize] = useState(50);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(formatNow()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const range = todayRangeUTC();
    setFromDate(range.fromDate.slice(0, 10));
    setToDate(range.toDate.slice(0, 10));
  }, []);

  useEffect(() => {
    let cancelled = false;
    // README §3 getmyinfo/{parentId}.
    // Prefer parent id; fall back to current member id so we always hit backend.
    const pathId =
      getMyInfoPathId() ||
      getSessionMemberId() ||
      "69803a1fda70c5ee87bf0493";
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

  useEffect(() => {
    if (activeTab !== "account-statement") return;
    if (!fromDate || !toDate) return;

    const userId =
      getSessionMemberId() || info?.id || "69803a1fda70c5ee87bf0493";
    const { fromDate: fromISO, toDate: toISO } = dateRangeToISO(fromDate, toDate);

    setStatementLoading(true);
    setStatementError(null);
    getAccountStatement(
      {
        page: statementPage,
        pageSize: statementPageSize,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { fromDate: fromISO, toDate: toISO },
      userId,
    )
      .then((res) => {
        setStatementRows(Array.isArray(res?.data) ? res.data : []);
        setStatementTotal(typeof res?.total === "number" ? res.total : 0);
      })
      .catch((e) => {
        setStatementRows([]);
        setStatementTotal(0);
        setStatementError(e instanceof Error ? e.message : "Failed to load account statement.");
      })
      .finally(() => setStatementLoading(false));
  }, [activeTab, fromDate, toDate, statementPage, statementPageSize, info?.id]);

  const debitTotal = statementRows.reduce((sum, r) => {
    const bal = Number((r as { balance?: unknown }).balance ?? 0);
    return sum + (Number.isFinite(bal) && bal < 0 ? Math.abs(bal) : 0);
  }, 0);
  const creditTotal = statementRows.reduce((sum, r) => {
    const bal = Number((r as { balance?: unknown }).balance ?? 0);
    return sum + (Number.isFinite(bal) && bal > 0 ? bal : 0);
  }, 0);

  const { profileName, profileUsername, profilePhone } = useMemo(() => {
    const fromLogin = getLoginProfileFromSession();
    return {
      profileName: fromLogin.name ?? info?.name,
      profileUsername: fromLogin.username ?? info?.username,
      profilePhone: fromLogin.phone ?? info?.phone,
    };
  }, [info?.name, info?.username, info?.phone]);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!currentPassword.trim() || !newPassword.trim()) {
      setMessage({ type: "error", text: "Enter current password and new password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    const userId =
      getSessionMemberId() || info?.id || "69803a1fda70c5ee87bf0493";
    setPasswordSubmitting(true);
    try {
      const text = await changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        userId,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordModalOpen(false);
      setMessage({ type: "success", text });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Change password failed.",
      });
    } finally {
      setPasswordSubmitting(false);
    }
  };

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
                  <span className="font-semibold text-red-600">
                    {formatCurrency(debitTotal)}
                  </span>
                </span>
                <span className="font-medium text-zinc-700">
                  Total Credit:{" "}
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(creditTotal)}
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  aria-label="From date"
                  value={fromDate}
                  onChange={(e) => {
                    setStatementPage(1);
                    setFromDate(e.target.value);
                  }}
                  className="h-9 w-[150px]"
                />
                <Input
                  type="date"
                  aria-label="To date"
                  value={toDate}
                  onChange={(e) => {
                    setStatementPage(1);
                    setToDate(e.target.value);
                  }}
                  className="h-9 w-[150px]"
                />
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
              {statementError && (
                <div className="px-4 py-3 text-sm text-red-600" role="alert">
                  {statementError}
                </div>
              )}
              <div className="divide-y divide-zinc-100">
                {statementLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-500">
                    Loading…
                  </div>
                ) : statementRows.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-500">
                    No statement data.
                  </div>
                ) : (
                  statementRows.map((row, idx) => {
                    const r = row as {
                      id?: unknown;
                      narration?: unknown;
                      remarks?: unknown;
                      comment?: unknown;
                      createdOn?: unknown;
                      balance?: unknown;
                      total?: unknown;
                      creditTotal?: unknown;
                    };
                    const delta = Number(r.balance ?? 0);
                    const debit = Number.isFinite(delta) && delta < 0 ? Math.abs(delta) : 0;
                    const credit = Number.isFinite(delta) && delta > 0 ? delta : 0;
                    const created = r.createdOn ? new Date(String(r.createdOn)) : null;
                    const dateText = created && !Number.isNaN(created.getTime())
                      ? created.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "—";
                    return (
                      <div
                        key={String(r.id ?? idx)}
                        className="px-4 py-3 text-sm text-zinc-800 sm:grid sm:grid-cols-6 sm:items-center sm:gap-3"
                      >
                        <div className="col-span-2">
                          <p className="text-sm text-zinc-800">
                            {String(r.narration ?? "—")}
                            {r.remarks ? (
                              <span className="text-zinc-500"> — {String(r.remarks)}</span>
                            ) : null}
                            {r.comment ? (
                              <span className="text-zinc-500"> ({String(r.comment)})</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="mt-2 text-xs text-red-600 sm:mt-0">
                          {debit ? formatCurrency(debit) : "0"}
                        </div>
                        <div className="mt-2 sm:mt-0">
                          {credit ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              {formatCurrency(credit)}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">0</span>
                          )}
                        </div>
                        <div className="mt-2 text-xs tabular-nums text-zinc-800 sm:mt-0">
                          {formatCurrency(Number(r.total ?? r.creditTotal ?? 0))}
                        </div>
                        <div className="mt-2 text-xs text-zinc-700 sm:mt-0">
                          {dateText}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <TablePagination
                page={statementPage}
                totalItems={statementTotal}
                pageSize={statementPageSize}
                onPageChange={setStatementPage}
                onPageSizeChange={(size) => {
                  if (!size) return;
                  setStatementPage(1);
                  setStatementPageSize(size);
                }}
                pageSizeOptions={[15, 30, 50]}
              />
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
                className={`flex items-center gap-2 rounded-sm border px-4 py-3 text-sm ${
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
            {/* Main profile card – name / username / phone (API + login session) */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm">
              <div className="max-w-xl space-y-0 p-4 sm:p-6">
                {profileName?.trim() ? (
                  <ProfileFieldRow
                    label="Name"
                    value={profileName}
                    editable={false}
                  />
                ) : null}
                <ProfileFieldRow
                  label="Username"
                  value={profileUsername}
                  copyable={Boolean(profileUsername?.trim())}
                  editable={false}
                />
                <ProfileFieldRow
                  label="Phone"
                  value={profilePhone}
                  editable={false}
                />
              </div>
            </div>

            {/* Change password */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm">
              <div className="p-4 sm:p-6">
                <h3 className="mb-4 text-sm font-semibold text-zinc-900">Password</h3>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setPasswordModalOpen(true)}
                >
                  Change password
                </Button>
              </div>
            </div>

            {/* Date/time line */}
            <p className="text-sm text-zinc-700">{now}</p>

            {/* Time zone card */}
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm">
              <div className="p-4 sm:p-6">
                <h3 className="mb-3 text-sm font-semibold text-zinc-900">Time</h3>
                {editingField === "timezone" ? (
                  <div className="rounded-sm border border-zinc-200 bg-white p-3">
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

      <Modal
        isOpen={passwordModalOpen}
        onClose={() => {
          if (passwordSubmitting) return;
          setPasswordModalOpen(false);
        }}
        title="Change password"
      >
        <form
          onSubmit={handleChangePassword}
          className="space-y-4"
          autoComplete="off"
        >
          <Input
            type="password"
            label="Current password"
            value={currentPassword}
            onChange={(ev) => setCurrentPassword(ev.target.value)}
            className="bg-white"
            autoComplete="current-password"
          />
          <Input
            type="password"
            label="New password"
            value={newPassword}
            onChange={(ev) => setNewPassword(ev.target.value)}
            className="bg-white"
            autoComplete="new-password"
          />
          <Input
            type="password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={(ev) => setConfirmPassword(ev.target.value)}
            className="bg-white"
            autoComplete="new-password"
          />
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={passwordSubmitting}
            >
              {passwordSubmitting ? "Updating…" : "Change password"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={passwordSubmitting}
              onClick={() => setPasswordModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
      </div>
    );
  }
