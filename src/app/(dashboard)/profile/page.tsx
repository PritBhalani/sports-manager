"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type FormEvent,
} from "react";
import {
  PageHeader,
  Button,
  Input,
  Modal,
  DialogActions,
  DialogSection,
  TablePagination,
} from "@/components";
import {
  User,
  FileText,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Copy,
  Check,
  Download,
  Bell,
} from "lucide-react";
import {
  getMyInfo,
  getMyInfoPathId,
  getUserById,
  getSessionMemberId,
  getLoginProfileFromSession,
} from "@/services/user.service";
import { getAccountStatement } from "@/services/account.service";
import { changePassword } from "@/services/auth.service";
import type { MyInfo } from "@/types/user.types";
import { dateRangeToISO, formatDateTime, todayRangeUTC } from "@/utils/date";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { formatCurrency } from "@/utils/formatCurrency";
import { downloadCsv } from "@/utils/csvDownload";
import NotificationSettingsForm from "@/components/settings/NotificationSettingsForm";

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
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="shrink-0 text-sm font-medium text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:justify-end">
        {children ?? (
          <>
            <span
              className={`truncate text-right text-sm ${
                isEmpty ? "text-placeholder" : "text-foreground"
              }`}
            >
              {display}
            </span>
            {copyable && !isEmpty && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-primary transition-colors hover:bg-info-subtle"
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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-primary transition-colors hover:bg-info-subtle"
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

/** Unwrap getuserbyid envelope; skip failed API envelopes without surfacing load errors. */
function myInfoFromGetUserById(raw: unknown): MyInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const env = raw as { success?: boolean; data?: unknown };
  if (env.success === false) return null;
  const data =
    env.data !== undefined && env.data !== null && typeof env.data === "object"
      ? env.data
      : raw;
  return data as MyInfo;
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex justify-between border-b border-border py-3">
          <div className="h-4 w-20 rounded bg-surface-2" />
          <div className="h-4 w-40 rounded bg-surface-2" />
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
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);

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
    // Primary: GET /user/getmyinfo/{parentId} (README §3).
    // Fallback: GET /user/getuserbyid/{memberId} to avoid blocking errors when getmyinfo fails or parent id is absent.
    const pathId = getMyInfoPathId();
    const memberId = getSessionMemberId();

    void (async () => {
      try {
        if (pathId) {
          try {
            const res = await getMyInfo(pathId);
            if (!cancelled) setInfo(res ?? null);
            return;
          } catch {
            /* use getuserbyid below */
          }
        }
        if (memberId) {
          const raw = await getUserById(memberId);
          const parsed = myInfoFromGetUserById(raw);
          if (!cancelled) setInfo(parsed);
        } else if (!cancelled) {
          setInfo(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

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

  const exportStatementCsv = useCallback(() => {
    const header = [
      "Narration",
      "Remarks",
      "Comment",
      "Debit",
      "Credit",
      "Balance",
      "Date",
    ];
    const out = statementRows.map((row) => {
      const r = row as {
        narration?: unknown;
        remarks?: unknown;
        comment?: unknown;
        balance?: unknown;
        total?: unknown;
        creditTotal?: unknown;
        createdOn?: unknown;
      };
      const delta = Number(r.balance ?? 0);
      const debit = Number.isFinite(delta) && delta < 0 ? Math.abs(delta) : 0;
      const credit = Number.isFinite(delta) && delta > 0 ? delta : 0;
      const dateText =
        r.createdOn != null && r.createdOn !== ""
          ? formatDateTime(r.createdOn)
          : "";
      return [
        String(r.narration ?? ""),
        String(r.remarks ?? ""),
        String(r.comment ?? ""),
        debit,
        credit,
        Number(r.total ?? r.creditTotal ?? 0),
        dateText,
      ];
    });
    downloadCsv(`account-statement-${fromDate}-${toDate}.csv`, header, out);
  }, [statementRows, fromDate, toDate]);

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
    } catch {
      // Global mutation toast handles API errors.
    } finally {
      setPasswordSubmitting(false);
    }
  };

    return (
      <div className="min-w-0">
      <PageHeader title="My Profile" breadcrumbs={["Profile"]} />

      {/* Tab bar – blue underline on active (matches reference) */}
      <div className="border-b border-border">
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
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:border-border-strong hover:text-foreground-secondary"
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-medium text-foreground-secondary">
                  Total Debit:
                  <span className="font-semibold text-error">
                    {formatCurrency(debitTotal)}
                  </span>
                </span>
                <span className="font-medium text-foreground-secondary">
                  Total Credit:
                  <span className="font-semibold text-success">
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
                  onClick={exportStatementCsv}
                  disabled={statementLoading || statementRows.length === 0}
                >
                  Export
                </Button>
              </div>
            </div>

            {/* Statement table mock */}
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="hidden bg-surface-muted px-4 py-2.5 text-xs font-semibold text-muted sm:grid sm:grid-cols-6">
                <span className="col-span-2">Narration</span>
                <span>Debit</span>
                <span>Credit</span>
                <span>Balance</span>
                <span>Date</span>
              </div>
              {statementError && (
                <div className="px-4 py-3 text-sm text-error" role="alert">
                  {statementError}
                </div>
              )}
              <div className="divide-y divide-border">
                {statementLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-muted">
                    Loading…
                  </div>
                ) : statementRows.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted">
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
                    const running = Number(r.total ?? r.creditTotal ?? 0);
                    const dateText = formatDateTime(r.createdOn);
                    return (
                      <div
                        key={String(r.id ?? idx)}
                        className="px-4 py-3 text-sm text-foreground sm:grid sm:grid-cols-6 sm:items-center sm:gap-3"
                      >
                        <div className="col-span-2">
                          <p className="text-sm text-foreground">
                            {String(r.narration ?? "—")}
                            {r.remarks ? (
                              <span className="text-muted"> — {String(r.remarks)}</span>
                            ) : null}
                            {r.comment ? (
                              <span className="text-muted"> ({String(r.comment)})</span>
                            ) : null}
                          </p>
                        </div>
                        <div
                          className={`mt-2 text-xs tabular-nums sm:mt-0 ${
                            debit > 0 ? "text-error" : "text-foreground"
                          }`}
                        >
                          {debit ? formatCurrency(debit) : "0"}
                        </div>
                        <div className="mt-2 sm:mt-0">
                          {credit ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                                credit > 0
                                  ? "bg-success-subtle text-success-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {formatCurrency(credit)}
                            </span>
                          ) : (
                            <span className="text-xs tabular-nums text-foreground">0</span>
                          )}
                        </div>
                        <div
                          className={`mt-2 text-xs tabular-nums sm:mt-0 ${signedAmountTextClass(running)}`}
                        >
                          {formatCurrency(running)}
                        </div>
                        <div className="mt-2 text-xs text-foreground-secondary sm:mt-0">
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
              <div className="overflow-hidden rounded-xl border border-border bg-surface-muted/80 p-6 shadow-sm">
                <ProfileSkeleton />
              </div>
            )}
            {!loading && message && (
              <div
                className={`flex items-center gap-2 rounded-sm border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-success/30 bg-success-subtle text-success-foreground"
                    : "border-error/30 bg-error-subtle text-error-foreground"
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
            <div className="overflow-hidden rounded-xl border border-border bg-surface-muted/80 shadow-sm">
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
            <div className="overflow-hidden rounded-xl border border-border bg-surface-muted/80 shadow-sm">
              <div className="p-4 sm:p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Password</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setPasswordModalOpen(true)}
                  >
                    Change password
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Bell className="h-4 w-4" aria-hidden />}
                    onClick={() => setNotificationsModalOpen(true)}
                  >
                    Notification
                  </Button>
                </div>
              </div>
            </div>

            {/* Date/time line */}
            <p className="text-sm text-foreground-secondary">{now}</p>

            {/* Time zone card */}
            <div className="overflow-hidden rounded-xl border border-border bg-surface-muted/80 shadow-sm">
              <div className="p-4 sm:p-6">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Time</h3>
                {editingField === "timezone" ? (
                  <div className="rounded-sm border border-border bg-surface p-3">
                    <Input
                      label="Time Zone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      placeholder="e.g. Asia/Calcutta"
                      className="bg-surface"
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
        footer={
          <DialogActions>
            <Button
              type="submit"
              form="profile-change-password-form"
              variant="primary"
              size="md"
              disabled={passwordSubmitting}
            >
              {passwordSubmitting ? "Updating…" : "Change password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={passwordSubmitting}
              onClick={() => setPasswordModalOpen(false)}
            >
              Cancel
            </Button>
          </DialogActions>
        }
      >
        <form
          id="profile-change-password-form"
          onSubmit={handleChangePassword}
          className="space-y-4"
          autoComplete="off"
        >
          <DialogSection>
            <Input
              type="password"
              label="Current password"
              value={currentPassword}
              onChange={(ev) => setCurrentPassword(ev.target.value)}
              className="bg-surface"
              autoComplete="current-password"
            />
            <Input
              type="password"
              label="New password"
              value={newPassword}
              onChange={(ev) => setNewPassword(ev.target.value)}
              className="bg-surface"
              autoComplete="new-password"
            />
            <Input
              type="password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={(ev) => setConfirmPassword(ev.target.value)}
              className="bg-surface"
              autoComplete="new-password"
            />
          </DialogSection>
        </form>
      </Modal>
      <Modal
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
        title="Notifications"
        footer={
          <DialogActions>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setNotificationsModalOpen(false)}
            >
              Close
            </Button>
          </DialogActions>
        }
      >
        <DialogSection>
          <NotificationSettingsForm />
        </DialogSection>
      </Modal>
      </div>
    );
  }
