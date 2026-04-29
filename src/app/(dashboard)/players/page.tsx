"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  ListPageFrame,
  ListFilterPanel,
  ListTableSection,
  Button,
  DialogActions,
  DialogFormRow,
  DialogSection,
  DialogPanel,
  DialogPanelHeader,
  DialogPanelBody,
  DIALOG_BODY_DEFAULT,
  DIALOG_BODY_COMPACT,
  Input,
  Select,
  Modal,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
} from "@/components";
import {
  Download,
  Filter,
  Eye,
  Network,
  Loader2,
  Lock,
  LockOpen,
  Landmark,
  Code2,
  Percent,
  Settings,
} from "lucide-react";
import { deposit, getDownline, withdraw } from "@/services/account.service";
import {
  changeBettingLock,
  getSessionMemberId,
  getUserById,
  setCommission,
  updateBetConfig,
  updateMember,
  getReferralSetting,
  updateReferralSetting,
  type UpdateBetConfigItem,
} from "@/services/user.service";
import { formatDateTime, timestampMs } from "@/utils/date";
import type { DownlineRecord } from "@/types/account.types";
import { getEventType, type EventTypeRecord } from "@/services/eventtype.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { downloadCsv } from "@/utils/csvDownload";
import CreateMemberModal from "@/components/players/CreateMemberModal";

/** Map UI filter to API `searchQuery.status` (empty = no filter / all). */
function statusForPlayerType(playerType: string): string {
  if (playerType === "inactive") return "-1,3";
  if (playerType === "active") return "1,2";
  return "";
}

function rowStatusLabel(status: unknown): { text: string; active: boolean } {
  const n = typeof status === "number" ? status : Number(status);
  if (n === 2 || n === 1) return { text: "ACTIVE", active: true };
  if (n === -1 || n === 3 || Number.isNaN(n)) return { text: "INACTIVE", active: false };
  return { text: String(status ?? "—"), active: false };
}

type DownlineTableContext = {
  expandedRows: Record<string, boolean>;
  downlineRows: Record<string, DownlineRecord[]>;
  downlineLoading: Record<string, boolean>;
  downlineError: Record<string, string | null>;
  toggleDownline: (parentId: string) => void | Promise<void>;
  openQuickEditModal: (id: string, uname: string, userCode: string) => void | Promise<void>;
  openBettingLockConfirm: (id: string, label: string, locked: boolean) => void;
  openCreditModal: (id: string, uname: string) => void;
  openBetConfigModal: (id: string, uname: string) => void;
  openCommissionModal: (id: string, uname: string) => void | Promise<void>;
  openReferralSettingsModal: (id: string, uname: string) => void | Promise<void>;
};

function DownlineExpansionRows({
  parentId,
  depth,
  expandedRows,
  downlineRows,
  downlineLoading,
  downlineError,
  toggleDownline,
  openQuickEditModal,
  openBettingLockConfirm,
  openCreditModal,
  openBetConfigModal,
  openCommissionModal,
  openReferralSettingsModal,
}: { parentId: string; depth: number } & DownlineTableContext) {
  if (downlineLoading[parentId]) {
    return (
      <TableRow>
        <td colSpan={12} className="px-4 py-3 text-sm text-muted">
          Loading downline...
        </td>
      </TableRow>
    );
  }
  const err = downlineError[parentId];
  if (err) {
    return (
      <TableRow>
        <td colSpan={12} className="px-4 py-3 text-sm text-error">
          {err}
        </td>
      </TableRow>
    );
  }
  const list = downlineRows[parentId] ?? [];
  if (list.length === 0) {
    return (
      <TableRow>
        <td colSpan={12} className="px-4 py-3 text-sm text-muted">
          No downline users.
        </td>
      </TableRow>
    );
  }

  return (
    <DownlineTableRows
      records={list}
      depth={depth}
      expandedRows={expandedRows}
      downlineRows={downlineRows}
      downlineLoading={downlineLoading}
      downlineError={downlineError}
      toggleDownline={toggleDownline}
      openQuickEditModal={openQuickEditModal}
      openBettingLockConfirm={openBettingLockConfirm}
      openCreditModal={openCreditModal}
      openBetConfigModal={openBetConfigModal}
      openCommissionModal={openCommissionModal}
      openReferralSettingsModal={openReferralSettingsModal}
    />
  );
}

function DownlineTableRows({
  records,
  depth,
  expandedRows,
  downlineRows,
  downlineLoading,
  downlineError,
  toggleDownline,
  openQuickEditModal,
  openBettingLockConfirm,
  openCreditModal,
  openBetConfigModal,
  openCommissionModal,
  openReferralSettingsModal,
}: DownlineTableContext & { records: DownlineRecord[]; depth: number }) {
  const firstCellPadStyle =
    depth >= 1 ? ({ paddingLeft: `${16 + depth * 16}px` } as const) : undefined;

  return (
    <>
      {records.map((child, idx) => {
        const cId = String(child.id ?? `nested-${depth}-${idx}`);
        const cUname = String(child.username ?? "—");
        const cUserCode = String(child.userCode ?? "—");
        const { text: cStatusText, active: cStatusActive } = rowStatusLabel(child.status);
        const cUserType = Number(child.userType ?? 0);
        const cIsLeaf = cUserType === 5;
        const cBal = child.balanceInfo as Record<string, unknown> | undefined;
        const cExposure = Number(
          cBal?.exposure ?? child.exposure ?? child.netExposure ?? 0,
        );
        const cTake = Number(cBal?.take ?? child.take ?? 0);
        const cGive = Number(cBal?.give ?? child.give ?? 0);
        const cBalance = Number(cBal?.balance ?? child.balance ?? 0);
        const cCreditLimit = Number(cBal?.creditLimit ?? child.creditLimit ?? 0);
        const cBettingLockRaw = child.bettingLock ?? cBal?.bettingLock;
        const cBettingLocked =
          cBettingLockRaw === true ||
          cBettingLockRaw === 1 ||
          String(cBettingLockRaw).toLowerCase() === "true";
        const cMobile = String(child.mobile ?? "");
        const cLastIp = String(child.remoteIp ?? child.ip ?? child.lastIp ?? "");
        const createdOn = (child as unknown as { createdOn?: unknown }).createdOn;
        const cExtraTooltip = [cLastIp, createdOn != null ? formatDateTime(createdOn) : ""]
          .filter(Boolean)
          .join(" · ");

        const isNestedExpanded = Boolean(expandedRows[cId]);

        return (
          <Fragment key={cId}>
            <TableRow>
              <TableCell className="!px-4 !py-4 text-foreground">
                <div style={firstCellPadStyle} title={cExtraTooltip || undefined}>
                  <div>
                    {cId ? (
                      <button
                        type="button"
                        onClick={() => void openQuickEditModal(cId, cUname, cUserCode)}
                        className="text-primary hover:underline"
                      >
                        {cUname}
                      </button>
                    ) : (
                      cUname
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    {cMobile || (cUserCode !== "—" ? cUserCode : "") ? (
                      cId ? (
                        <button
                          type="button"
                          onClick={() => void openQuickEditModal(cId, cUname, cUserCode)}
                          className="text-primary hover:underline"
                        >
                          ({cMobile || cUserCode})
                        </button>
                      ) : (
                        `(${cMobile || cUserCode})`
                      )
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="!px-4 !py-4 text-foreground">
                {!cIsLeaf && cId ? (
                  <button
                    type="button"
                    onClick={() => void toggleDownline(cId)}
                    className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-2 ${
                      isNestedExpanded
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border"
                    }`}
                    aria-expanded={isNestedExpanded}
                    aria-label={isNestedExpanded ? "Hide downline" : "Show downline"}
                  >
                    <Network className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </TableCell>
              <TableCell className="!px-4 !py-4 text-center">
                <button
                  type="button"
                  disabled={!cId}
                  onClick={() =>
                    openBettingLockConfirm(
                      cId,
                      cUserCode !== "—" ? cUserCode : cUname,
                      cBettingLocked,
                    )
                  }
                  className="inline-flex items-center justify-center gap-1 rounded-sm p-0.5 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    cBettingLocked ? "Click to unlock betting" : "Click to lock betting"
                  }
                  aria-label={
                    cBettingLocked
                      ? `Confirm unlock betting for ${cUname}`
                      : `Confirm lock betting for ${cUname}`
                  }
                >
                  {cBettingLocked ? (
                    <Lock className="h-4 w-4 text-red-600" aria-hidden />
                  ) : (
                    <LockOpen className="h-4 w-4 text-[#2f9e44]" aria-hidden />
                  )}
                  <span className="sr-only">{cBettingLocked ? "Locked" : "Open"}</span>
                </button>
              </TableCell>
              <TableCell className="!px-4 !py-4 text-center">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    cStatusActive
                      ? "bg-[#d3f9d8] text-[#2f9e44]"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {cStatusText}
                </span>
              </TableCell>
              <TableCell className="!px-4 !py-4 text-left text-sm text-primary">
                {cId ? (
                  <Link
                    href={`/players/${encodeURIComponent(cId)}`}
                    className="rounded-sm p-0.5 hover:bg-info-subtle text-primary"
                    aria-label="View player"
                  >
                    <Eye className="h-4 w-4" aria-hidden />
                  </Link>
                ) : null}
              </TableCell>
              <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(cExposure ?? 0))}`}>
                {formatCurrency(cExposure)}
              </TableCell>
              <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(cTake ?? 0))}`}>
                {formatCurrency(cTake)}
              </TableCell>
              <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(cGive ?? 0))}`}>
                {formatCurrency(cGive)}
              </TableCell>
              <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(cBalance ?? 0))}`}>
                {formatCurrency(cBalance)}
              </TableCell>
              <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(cBalance + cExposure))}`}>
                {formatCurrency(cBalance + cExposure)}
              </TableCell>
              <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(cCreditLimit ?? 0))}`}>
                {formatCurrency(cCreditLimit)}
              </TableCell>
              <TableCell className="!px-4 !py-4 text-center">
                <div className="flex flex-wrap items-center justify-center gap-1 text-primary">
                  <button
                    type="button"
                    onClick={() => openCreditModal(cId, cUname)}
                    className="rounded-sm p-0.5 hover:bg-info-subtle"
                    aria-label="Open credit popup"
                  >
                    <Landmark className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => openBetConfigModal(cId, cUname)}
                    className="rounded-sm p-0.5 hover:bg-info-subtle"
                    aria-label="Open bet configuration popup"
                  >
                    <Code2 className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void openCommissionModal(cId, cUname)}
                    className="rounded-sm p-0.5 hover:bg-info-subtle"
                    aria-label="Open commission popup"
                  >
                    <Percent className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void openReferralSettingsModal(cId, cUname)}
                    className="rounded-sm p-0.5 hover:bg-info-subtle"
                    aria-label="Open referral settings"
                  >
                    <Settings className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </TableCell>
            </TableRow>
            {!cIsLeaf && cId && isNestedExpanded ? (
              <DownlineExpansionRows
                parentId={cId}
                depth={depth + 1}
                expandedRows={expandedRows}
                downlineRows={downlineRows}
                downlineLoading={downlineLoading}
                downlineError={downlineError}
                toggleDownline={toggleDownline}
                openQuickEditModal={openQuickEditModal}
                openBettingLockConfirm={openBettingLockConfirm}
                openCreditModal={openCreditModal}
                openBetConfigModal={openBetConfigModal}
                openCommissionModal={openCommissionModal}
                openReferralSettingsModal={openReferralSettingsModal}
              />
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}

type CreditModalState = {
  open: boolean;
  userId: string;
  username: string;
};

type BetConfigRow = {
  key: string;
  label: string;
  enabled: boolean;
  minBet: string;
  maxBet: string;
  betDelay: string;
  exposure: string;
  profit: string;
};

type BetConfigModalState = {
  open: boolean;
  userId: string;
  username: string;
};

type CommissionModalState = {
  open: boolean;
  userId: string;
  username: string;
};

type ReferralSettingsModalState = {
  open: boolean;
  userId: string;
  username: string;
};

type ReferralSettingsFormState = {
  bonus: string;
  lockingDays: string;
  minDeposit: string;
  minWithdrawalAmount: string;
  minimumBalanceRequired: string;
};

type BettingLockConfirmState = {
  open: boolean;
  userId: string;
  label: string;
  nextLocked: boolean;
  saving: boolean;
  error: string | null;
};

const INITIAL_BETTING_LOCK_CONFIRM: BettingLockConfirmState = {
  open: false,
  userId: "",
  label: "",
  nextLocked: true,
  saving: false,
  error: null,
};

type PlayerQuickEditStatus = "active" | "inactive" | "suspended" | "close";

type PlayerQuickEditModalState = {
  open: boolean;
  userId: string;
  username: string;
  userCode: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  mobile: string;
  pt: string;
  password: string;
  repeatPassword: string;
  status: PlayerQuickEditStatus;
  notes: string;
};

type CommissionFieldKey =
  | "odds"
  | "line"
  | "asianHandicapDoubleLine"
  | "asianHandicapSingleLine"
  | "fixedOdds"
  | "session"
  | "scoreRange"
  | "bm";

type CommissionField = {
  key: CommissionFieldKey;
  label: string;
};

type CommissionApiRow = {
  percentage?: number | string;
  bettingType?: number | string;
  commissionOn?: number | string;
  commissionType?: number | string;
  superAdminShare?: number;
  adminShare?: number;
  superMasterShare?: number;
  masterShare?: number;
  agentShare?: number;
};

const COMMISSION_FIELDS: CommissionField[] = [
  { key: "odds", label: "ODDS" },
  { key: "line", label: "LINE" },
  { key: "asianHandicapDoubleLine", label: "ASIAN_HANDICAP_DOUBLE_LINE" },
  { key: "asianHandicapSingleLine", label: "ASIAN_HANDICAP_SINGLE_LINE" },
  { key: "fixedOdds", label: "FIXED_ODDS" },
  { key: "session", label: "SESSION" },
  { key: "scoreRange", label: "SCORE_RANGE" },
  { key: "bm", label: "BM" },
];

const COMMISSION_BETTING_TYPE: Record<CommissionFieldKey, number> = {
  odds: 1,
  line: 2,
  asianHandicapDoubleLine: 4,
  asianHandicapSingleLine: 5,
  fixedOdds: 6,
  session: 7,
  scoreRange: 8,
  bm: 9,
};

function defaultCommissionValues(): Record<CommissionFieldKey, string> {
  return {
    odds: "0",
    line: "0",
    asianHandicapDoubleLine: "0",
    asianHandicapSingleLine: "0",
    fixedOdds: "0",
    session: "0",
    scoreRange: "0",
    bm: "0",
  };
}

function readCommissionValuesFromUser(raw: unknown): Record<CommissionFieldKey, string> {
  const envelope = raw as { data?: unknown };
  const data =
    envelope && typeof envelope === "object" && "data" in envelope
      ? (envelope.data as { commissions?: unknown })
      : (raw as { commissions?: unknown });
  const commissions = Array.isArray(data?.commissions)
    ? (data.commissions as CommissionApiRow[])
    : [];

  const values = defaultCommissionValues();
  const keyByType = new Map<number, CommissionFieldKey>(
    (Object.entries(COMMISSION_BETTING_TYPE) as Array<[CommissionFieldKey, number]>)
      .map(([key, bettingType]) => [bettingType, key]),
  );

  commissions.forEach((row) => {
    const bettingType = Number(row.bettingType);
    const key = keyByType.get(bettingType);
    if (!key) return;
    values[key] = numberToStr(row.percentage ?? 0) || "0";
  });
  return values;
}

function eventTypeIdOf(r: EventTypeRecord): string {
  return String((r as { id?: unknown; eventTypeId?: unknown }).id ?? (r as { eventTypeId?: unknown }).eventTypeId ?? "").trim();
}
function eventTypeNameOf(r: EventTypeRecord): string {
  return String((r as { name?: unknown; eventTypeName?: unknown }).name ?? (r as { eventTypeName?: unknown }).eventTypeName ?? "").trim();
}

type BetConfigApiRow = {
  eventTypeId?: string;
  minBet?: number;
  maxBet?: number;
  betDelay?: number;
  maxExposure?: number;
  maxProfit?: number;
};

function getSessionCurrencyRate(): number {
  if (typeof window === "undefined") return 1;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAuthSession } = require("@/store/authStore") as {
      getAuthSession?: () => { currency?: { rate?: unknown } };
    };
    const session = getAuthSession?.();
    const r = Number(session?.currency?.rate ?? 1);
    return Number.isFinite(r) && r > 0 ? r : 1;
  } catch {
    return 1;
  }
}

function numberToStr(v: unknown): string {
  if (v == null) return "";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "";
  // Keep integers where possible; backend sends decimals but UI expects plain numbers.
  return Number.isInteger(n) ? String(n) : String(n);
}

function buildRowsFromApi(api: BetConfigApiRow[], eventTypes: EventTypeRecord[]): BetConfigRow[] {
  const nameById = new Map(
    (eventTypes ?? [])
      .map((e) => [eventTypeIdOf(e), eventTypeNameOf(e)] as const)
      .filter(([id]) => Boolean(id)),
  );
  const rate = getSessionCurrencyRate();
  return (api ?? []).map((cfg) => {
    const id = String(cfg.eventTypeId ?? "").trim();
    const label = nameById.get(id) || `Event ${id.slice(0, 8) || "—"}`;
    return {
      key: id || `event-${Math.random().toString(16).slice(2)}`,
      label,
      enabled: true,
      minBet: numberToStr((cfg.minBet ?? 0) * rate),
      maxBet: numberToStr((cfg.maxBet ?? 0) * rate),
      betDelay: numberToStr(cfg.betDelay),
      exposure: numberToStr((cfg.maxExposure ?? 0) * rate),
      profit: numberToStr((cfg.maxProfit ?? 0) * rate),
    };
  });
}

function isSyntheticBetConfigKey(key: string): boolean {
  return !key.trim() || key.startsWith("event-");
}

function buildUpdateBetConfigPayload(
  userId: string,
  rows: BetConfigRow[],
  applyAll: boolean,
):
  | { ok: true; body: { id: string; betConfigs: UpdateBetConfigItem[]; applyAll: boolean } }
  | { ok: false; error: string } {
  const rate = getSessionCurrencyRate();
  if (!userId.trim()) {
    return { ok: false, error: "Missing user id." };
  }
  const betConfigs: UpdateBetConfigItem[] = [];

  for (const row of rows) {
    if (isSyntheticBetConfigKey(row.key)) continue;
    const minBet = Number(row.minBet) / rate;
    const maxBet = Number(row.maxBet) / rate;
    const betDelay = Number(row.betDelay);
    const maxExposure = Number(row.exposure) / rate;
    const maxProfit = Number(row.profit) / rate;
    if (
      !Number.isFinite(minBet) ||
      !Number.isFinite(maxBet) ||
      !Number.isFinite(betDelay) ||
      !Number.isFinite(maxExposure) ||
      !Number.isFinite(maxProfit)
    ) {
      return { ok: false, error: `Invalid numbers for ${row.label}.` };
    }
    betConfigs.push({
      eventTypeId: row.key,
      minBet,
      maxBet,
      betDelay,
      maxExposure,
      maxProfit,
      haveChange: true,
    });
  }

  if (betConfigs.length === 0) {
    return { ok: false, error: "No bet configuration rows to save." };
  }

  return { ok: true, body: { id: userId, betConfigs, applyAll } };
}

function unwrapUserPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const envelope = raw as { data?: unknown };
  if (envelope.data && typeof envelope.data === "object") {
    return envelope.data as Record<string, unknown>;
  }
  return raw as Record<string, unknown>;
}

function toQuickEditStatus(raw: unknown): PlayerQuickEditStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "inactive" || s === "-1") return "inactive";
  if (s === "suspended" || s === "0") return "suspended";
  if (s === "close" || s === "closed" || s === "-2") return "close";
  return "active";
}

function toApiStatus(status: PlayerQuickEditStatus): number {
  if (status === "inactive") return -1;
  if (status === "suspended") return 0;
  if (status === "close") return -2;
  return 2;
}

function PlayerQuickEditModal({
  state,
  onClose,
  onChange,
  onSave,
}: {
  state: PlayerQuickEditModalState;
  onClose: () => void;
  onChange: (patch: Partial<PlayerQuickEditModalState>) => void;
  onSave: () => void;
}) {
  const statusOptions: Array<{ value: PlayerQuickEditStatus; label: string }> = [
    { value: "active", label: "ACTIVE" },
    { value: "inactive", label: "INACTIVE" },
    { value: "suspended", label: "SUSPENDED" },
    { value: "close", label: "CLOSE" },
  ];

  return (
    <Modal
      isOpen={state.open}
      onClose={onClose}
      title="Information"
      maxWidthClassName="max-w-4xl"
      bodyClassName={DIALOG_BODY_DEFAULT}
      footer={
        <DialogActions>
          <Button type="button" variant="primary" size="md" onClick={onSave} disabled={state.saving || state.loading}>
            {state.saving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={state.saving}>
            Cancel
          </Button>
        </DialogActions>
      }
    >
      <DialogSection>
        <div className="space-y-4">
        <DialogPanel>
          <DialogPanelHeader title="Member" />
          <DialogPanelBody>
            <p className="text-sm font-semibold text-foreground">User Name (Usercode)</p>
            <p className="mt-1 text-sm text-foreground-secondary">
              {state.username || "—"}
              {state.userCode ? ` (${state.userCode})` : ""}
            </p>
          </DialogPanelBody>
        </DialogPanel>

        {state.loading ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading player details...
          </div>
        ) : null}

        {state.error ? (
          <p className="text-sm text-error" role="alert">
            {state.error}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Mobile"
            value={state.mobile}
            onChange={(e) => onChange({ mobile: e.target.value })}
            placeholder="Enter mobile"
            disabled={state.loading || state.saving}
          />
          <Input
            label="PT"
            value={state.pt}
            onChange={(e) => onChange({ pt: e.target.value })}
            placeholder="Enter PT"
            disabled={state.loading || state.saving}
          />
          <Input
            type="password"
            label="Password"
            value={state.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="Leave blank to keep unchanged"
            disabled={state.loading || state.saving}
          />
          <Input
            type="password"
            label="Repeat Password"
            value={state.repeatPassword}
            onChange={(e) => onChange({ repeatPassword: e.target.value })}
            placeholder="Repeat new password"
            disabled={state.loading || state.saving}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Status</p>
          <div className="flex flex-wrap items-center gap-4">
            {statusOptions.map((option) => (
              <label
                key={option.value}
                className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="radio"
                  name="player-status"
                  checked={state.status === option.value}
                  onChange={() => onChange({ status: option.value })}
                  disabled={state.loading || state.saving}
                  className="h-4 w-4 border-border"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <label className="mb-1 block text-sm font-medium text-foreground-secondary">
            Notes
          </label>
          <textarea
            value={state.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Add notes about this user"
            rows={4}
            disabled={state.loading || state.saving}
            className="box-border w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-surface-muted disabled:text-muted"
          />
        </div>
        </div>
      </DialogSection>
    </Modal>
  );
}

function CreditActionModal({
  state,
  mode,
  amount,
  remarks,
  saving,
  submitError,
  onClose,
  onModeChange,
  onAmountChange,
  onRemarksChange,
  onSave,
}: {
  state: CreditModalState;
  mode: "D" | "W";
  amount: string;
  remarks: string;
  saving: boolean;
  submitError: string | null;
  onClose: () => void;
  onModeChange: (mode: "D" | "W") => void;
  onAmountChange: (value: string) => void;
  onRemarksChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Modal
      isOpen={state.open}
      onClose={onClose}
      title={`${mode === "D" ? "Deposit" : "Withdraw"} - ${state.username || "User"}`}
      maxWidthClassName="max-w-lg"
      bodyClassName={DIALOG_BODY_DEFAULT}
      footer={
        <DialogActions>
          <Button type="button" variant="primary" size="md" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </DialogActions>
      }
    >
      <DialogSection>
        {submitError ? (
          <p className="text-sm text-error" role="alert">
            {submitError}
          </p>
        ) : null}
        <DialogFormRow>
          <button
            type="button"
            onClick={() => onModeChange("D")}
            className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-sm border px-2 text-sm font-semibold ${
              mode === "D"
                ? "border-green-600 bg-green-600 text-white"
                : "border-border-strong bg-surface text-foreground-secondary"
            }`}
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => onModeChange("W")}
            className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-sm border px-2 text-sm font-semibold ${
              mode === "W"
                ? "border-green-600 bg-green-600 text-white"
                : "border-border-strong bg-surface text-foreground-secondary"
            }`}
          >
            Withdraw
          </button>
          <Input
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="Amount"
            className="h-8"
          />
        </DialogFormRow>
        <Input
          value={remarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          placeholder="Please enter remarks"
          className="h-8"
        />
      </DialogSection>
    </Modal>
  );
}

function BetConfigModal({
  state,
  rows,
  loading,
  error,
  saving,
  onClose,
  onToggle,
  onFieldChange,
  onApplyToAllChild,
  onSave,
}: {
  state: BetConfigModalState;
  rows: BetConfigRow[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onToggle: (key: string) => void;
  onFieldChange: (key: string, field: keyof Omit<BetConfigRow, "key" | "label" | "enabled">, value: string) => void;
  onApplyToAllChild: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      isOpen={state.open}
      onClose={onClose}
      title={`Update Bet Configuration - ${state.username || "User"}`}
      maxWidthClassName="max-w-[95vw]"
      bodyClassName="space-y-4 p-4 sm:p-5"
      footer={
        <DialogActions>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onApplyToAllChild}
            disabled={saving || loading}
          >
            Apply To All Child
          </Button>
          <Button type="button" variant="primary" size="md" onClick={onSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </DialogActions>
      }
    >
      <DialogSection>
        {loading ? (
          <div className="flex items-center gap-2 px-1 py-2 text-sm text-foreground-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading configuration...
          </div>
        ) : error ? (
          <div className="px-1 py-2 text-sm text-error" role="alert">
            {error}
          </div>
        ) : null}
        <div className="grid grid-cols-[1.25fr_repeat(5,minmax(88px,1fr))] gap-2 text-xs font-semibold text-muted">
          <div>Event Types</div>
          <div>Min Bet</div>
          <div>Max Bet</div>
          <div>Bet Delay</div>
          <div>Exposure</div>
          <div>Profit</div>
        </div>
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[1.25fr_repeat(5,minmax(88px,1fr))] gap-2">
            <label className="flex items-center gap-2 text-sm text-foreground-secondary">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={() => onToggle(row.key)}
                className="h-4 w-4 rounded border-border-strong"
                disabled={loading || saving}
              />
              <span>{row.label}</span>
            </label>
            <Input value={row.minBet} onChange={(e) => onFieldChange(row.key, "minBet", e.target.value)} className="h-8 text-sm" disabled={loading || saving} placeholder="—" />
            <Input value={row.maxBet} onChange={(e) => onFieldChange(row.key, "maxBet", e.target.value)} className="h-8 text-sm" disabled={loading || saving} placeholder="—" />
            <Input value={row.betDelay} onChange={(e) => onFieldChange(row.key, "betDelay", e.target.value)} className="h-8 text-sm" disabled={loading || saving} placeholder="—" />
            <Input value={row.exposure} onChange={(e) => onFieldChange(row.key, "exposure", e.target.value)} className="h-8 text-sm" disabled={loading || saving} placeholder="—" />
            <Input value={row.profit} onChange={(e) => onFieldChange(row.key, "profit", e.target.value)} className="h-8 text-sm" disabled={loading || saving} placeholder="—" />
          </div>
        ))}
      </DialogSection>
    </Modal>
  );
}

function CommissionModal({
  state,
  values,
  loading,
  error,
  saving,
  onClose,
  onFieldChange,
  onSave,
}: {
  state: CommissionModalState;
  values: Record<CommissionFieldKey, string>;
  loading: boolean;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onFieldChange: (key: CommissionFieldKey, value: string) => void;
  onSave: () => void;
}) {
  return (
    <Modal
      isOpen={state.open}
      onClose={onClose}
      title="Set Commission"
      maxWidthClassName="max-w-3xl"
      bodyClassName={DIALOG_BODY_DEFAULT}
      footer={
        <DialogActions>
          <Button type="button" variant="primary" size="md" onClick={onSave} disabled={loading || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={loading || saving}>
            Cancel
          </Button>
        </DialogActions>
      }
    >
      <DialogSection>
        <p className="text-sm font-semibold text-foreground">
          Set Commission of <span className="text-error">{state.username || "User"}</span>
        </p>
        {loading ? (
          <div className="flex items-center gap-2 py-1 text-sm text-foreground-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading commission...
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="space-y-2">
          {COMMISSION_FIELDS.map((field) => (
            <div key={field.key} className="grid grid-cols-[minmax(140px,240px)_1fr] items-center gap-3">
              <label className="text-sm text-foreground" htmlFor={`commission-${field.key}`}>
                {field.label}
              </label>
              <Input
                id={`commission-${field.key}`}
                value={values[field.key]}
                onChange={(e) => onFieldChange(field.key, e.target.value)}
                rightIcon={<span className="text-foreground font-semibold">%</span>}
                className="h-8"
                disabled={loading || saving}
              />
            </div>
          ))}
        </div>
      </DialogSection>
    </Modal>
  );
}

function ReferralSettingsModal({
  state,
  form,
  loading,
  error,
  saving,
  onClose,
  onFieldChange,
  onApplyAll,
  onSave,
}: {
  state: ReferralSettingsModalState;
  form: ReferralSettingsFormState;
  loading: boolean;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onFieldChange: (key: keyof ReferralSettingsFormState, value: string) => void;
  onApplyAll: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      isOpen={state.open}
      onClose={onClose}
      title="Settings"
      maxWidthClassName="max-w-lg"
      bodyClassName={DIALOG_BODY_DEFAULT}
      footer={
        <DialogActions>
          <Button type="button" variant="primary" size="md" onClick={onApplyAll} disabled={loading || saving}>
            Apply All
          </Button>
          <Button type="button" variant="primary" size="md" onClick={onSave} disabled={loading || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={saving}>
            Close
          </Button>
        </DialogActions>
      }
    >
      <DialogSection>
        {loading ? (
          <div className="flex items-center gap-2 py-1 text-sm text-foreground-tertiary">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading settings…
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="space-y-2">
          <div className="grid grid-cols-[minmax(140px,200px)_1fr] items-center gap-3">
            <label className="text-sm text-foreground" htmlFor="referral-bonus">
              Bonus %
            </label>
            <Input
              id="referral-bonus"
              value={form.bonus}
              onChange={(e) => onFieldChange("bonus", e.target.value)}
              className="h-8"
              disabled={loading || saving}
            />
          </div>
          <div className="grid grid-cols-[minmax(140px,200px)_1fr] items-center gap-3">
            <label className="text-sm text-foreground" htmlFor="referral-locking">
              Locking Days
            </label>
            <Input
              id="referral-locking"
              value={form.lockingDays}
              onChange={(e) => onFieldChange("lockingDays", e.target.value)}
              className="h-8"
              disabled={loading || saving}
            />
          </div>
          <div className="grid grid-cols-[minmax(140px,200px)_1fr] items-center gap-3">
            <label className="text-sm text-foreground" htmlFor="referral-min-dep">
              Min Deposit
            </label>
            <Input
              id="referral-min-dep"
              value={form.minDeposit}
              onChange={(e) => onFieldChange("minDeposit", e.target.value)}
              className="h-8"
              disabled={loading || saving}
            />
          </div>
          <div className="grid grid-cols-[minmax(140px,200px)_1fr] items-center gap-3">
            <label className="text-sm text-foreground" htmlFor="referral-min-wd">
              Min Withdrawal
            </label>
            <Input
              id="referral-min-wd"
              value={form.minWithdrawalAmount}
              onChange={(e) => onFieldChange("minWithdrawalAmount", e.target.value)}
              className="h-8"
              disabled={loading || saving}
            />
          </div>
          <div className="grid grid-cols-[minmax(140px,200px)_1fr] items-center gap-3">
            <label className="text-sm text-foreground" htmlFor="referral-min-bal">
              Min Balance
            </label>
            <Input
              id="referral-min-bal"
              value={form.minimumBalanceRequired}
              onChange={(e) => onFieldChange("minimumBalanceRequired", e.target.value)}
              className="h-8"
              disabled={loading || saving}
            />
          </div>
        </div>
      </DialogSection>
    </Modal>
  );
}

export default function PlayersPage() {
  const [username, setUsername] = useState("");
  const [userCode, setUserCode] = useState("");
  const [playerType, setPlayerType] = useState("all");
  const [rows, setRows] = useState<DownlineRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditModal, setCreditModal] = useState<CreditModalState>({
    open: false,
    userId: "",
    username: "",
  });
  const [creditMode, setCreditMode] = useState<"D" | "W">("D");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditRemarks, setCreditRemarks] = useState("");
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditSubmitError, setCreditSubmitError] = useState<string | null>(null);
  const [betConfigModal, setBetConfigModal] = useState<BetConfigModalState>({
    open: false,
    userId: "",
    username: "",
  });
  const [betConfigRows, setBetConfigRows] = useState<BetConfigRow[]>([]);
  const [betConfigSaving, setBetConfigSaving] = useState(false);
  const [betConfigLoading, setBetConfigLoading] = useState(false);
  const [betConfigError, setBetConfigError] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<EventTypeRecord[] | null>(null);
  const [commissionModal, setCommissionModal] = useState<CommissionModalState>({
    open: false,
    userId: "",
    username: "",
  });
  const [commissionValues, setCommissionValues] = useState<Record<CommissionFieldKey, string>>(
    () => defaultCommissionValues(),
  );
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [referralModal, setReferralModal] = useState<ReferralSettingsModalState>({
    open: false,
    userId: "",
    username: "",
  });
  const [referralForm, setReferralForm] = useState<ReferralSettingsFormState>({
    bonus: "0",
    lockingDays: "0",
    minDeposit: "0",
    minWithdrawalAmount: "0",
    minimumBalanceRequired: "0",
  });
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralSaving, setReferralSaving] = useState(false);
  const [quickEditModal, setQuickEditModal] = useState<PlayerQuickEditModalState>({
    open: false,
    userId: "",
    username: "",
    userCode: "",
    loading: false,
    saving: false,
    error: null,
    mobile: "",
    pt: "",
    password: "",
    repeatPassword: "",
    status: "active",
    notes: "",
  });
  const [createMemberOpen, setCreateMemberOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [activeExpandedRowId, setActiveExpandedRowId] = useState<string | null>(null);
  const [downlineRows, setDownlineRows] = useState<Record<string, DownlineRecord[]>>({});
  const [downlineLoading, setDownlineLoading] = useState<Record<string, boolean>>({});
  const [downlineError, setDownlineError] = useState<Record<string, string | null>>({});
  const [bettingLockConfirm, setBettingLockConfirm] =
    useState<BettingLockConfirmState>(INITIAL_BETTING_LOCK_CONFIRM);

  const parentByChildId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [parentId, list] of Object.entries(downlineRows)) {
      for (const row of list ?? []) {
        const childId = String((row as { id?: unknown }).id ?? "");
        if (!childId) continue;
        map[childId] = parentId;
      }
    }
    return map;
  }, [downlineRows]);

  const findUserTypeById = useCallback(
    (id: string): number => {
      if (!id) return 0;
      const fromTop = rows.find((r) => String(r.id ?? "") === id);
      if (fromTop) return Number(fromTop.userType ?? 0);
      for (const list of Object.values(downlineRows)) {
        const hit = list?.find((r) => String((r as { id?: unknown }).id ?? "") === id);
        if (hit) return Number((hit as { userType?: unknown }).userType ?? 0);
      }
      return 0;
    },
    [downlineRows, rows],
  );

  const createMemberButtonLabel = (() => {
    if (!activeExpandedRowId) return "New MA";
    const userType = findUserTypeById(activeExpandedRowId);
    // Common hierarchy: 3=MA, 4=AG, 5=PL (leaf). If we expand an AG, we create a PL.
    if (userType === 4) return "New PL";
    return "New AG";
  })();

  const createMemberParentId = activeExpandedRowId || getSessionMemberId() || null;

  const patchBettingLockInList = useCallback((userId: string, bettingLock: boolean) => {
    setRows((prev) =>
      prev.map((r) => (String(r.id) === userId ? { ...r, bettingLock } : r)),
    );
    setDownlineRows((prev) => {
      let changed = false;
      const next: Record<string, DownlineRecord[]> = { ...prev };
      for (const k of Object.keys(next)) {
        const list = next[k];
        if (!list?.some((c) => String(c.id) === userId)) continue;
        changed = true;
        next[k] = list.map((c) =>
          String(c.id) === userId ? { ...c, bettingLock } : c,
        );
      }
      return changed ? next : prev;
    });
  }, []);

  const openBettingLockConfirm = useCallback(
    (userId: string, label: string, currentlyLocked: boolean) => {
      const uid = userId.trim();
      if (!uid) return;
      const lbl = label.trim() || uid;
      setBettingLockConfirm({
        open: true,
        userId: uid,
        label: lbl,
        nextLocked: !currentlyLocked,
        saving: false,
        error: null,
      });
    },
    [],
  );

  const closeBettingLockConfirm = useCallback(() => {
    setBettingLockConfirm((p) => (p.saving ? p : { ...INITIAL_BETTING_LOCK_CONFIRM }));
  }, []);

  const confirmBettingLockChange = useCallback(async () => {
    const { userId, nextLocked } = bettingLockConfirm;
    if (!userId) return;
    setBettingLockConfirm((p) => ({ ...p, saving: true, error: null }));
    try {
      await changeBettingLock({ userId, bettingLock: nextLocked });
      patchBettingLockInList(userId, nextLocked);
      setBettingLockConfirm(INITIAL_BETTING_LOCK_CONFIRM);
    } catch (e) {
      setBettingLockConfirm((p) => ({
        ...p,
        saving: false,
        error: e instanceof Error ? e.message : "Could not update betting lock.",
      }));
    }
  }, [bettingLockConfirm.userId, bettingLockConfirm.nextLocked, patchBettingLockInList]);

  const loadDownline = useCallback(() => {
    const scopeId = getSessionMemberId();
    if (!scopeId) {
      setError("Log in to load downline players.");
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    getDownline(
      {
        page,
        pageSize,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      {
        userCode: userCode.trim(),
        username: username.trim(),
        status: statusForPlayerType(playerType),
        userId: null,
      },
      scopeId,
    )
      .then((res) => {
        setRows(Array.isArray(res.data) ? res.data : []);
        setTotal(typeof res.total === "number" ? res.total : 0);
        setExpandedRows({});
        setActiveExpandedRowId(null);
        setDownlineRows({});
        setDownlineLoading({});
        setDownlineError({});
      })
      .catch((e) => {
        setRows([]);
        setTotal(0);
        setActiveExpandedRowId(null);
        setError(e instanceof Error ? e.message : "Failed to load players.");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, username, userCode, playerType]);

  useEffect(() => {
    loadDownline();
  }, [loadDownline]);

  const toggleDownline = async (parentId: string) => {
    if (!parentId) return;
    const currentlyOpen = Boolean(expandedRows[parentId]);

    const ancestorIds: string[] = [];
    let cursor = parentByChildId[parentId];
    while (cursor) {
      ancestorIds.unshift(cursor);
      cursor = parentByChildId[cursor];
    }

    if (currentlyOpen) {
      const next: Record<string, boolean> = {};
      for (const id of ancestorIds) next[id] = true;
      setExpandedRows(next);
      setActiveExpandedRowId(ancestorIds.at(-1) ?? null);
      return;
    }

    const next: Record<string, boolean> = {};
    for (const id of ancestorIds) next[id] = true;
    next[parentId] = true;
    setExpandedRows(next);
    setActiveExpandedRowId(parentId);
    if (downlineRows[parentId]) return;

    setDownlineLoading((prev) => ({ ...prev, [parentId]: true }));
    setDownlineError((prev) => ({ ...prev, [parentId]: null }));
    try {
      const res = await getDownline(
        {
          pageSize: 200,
          groupBy: "",
          page: 1,
          orderBy: "",
          orderByDesc: false,
        },
        {
          userCode: "",
          username: "",
          status: "-1",
          userId: null,
        },
        parentId,
      );
      setDownlineRows((prev) => ({
        ...prev,
        [parentId]: Array.isArray(res.data) ? res.data : [],
      }));
    } catch (e) {
      setDownlineRows((prev) => ({ ...prev, [parentId]: [] }));
      setDownlineError((prev) => ({
        ...prev,
        [parentId]:
          e instanceof Error ? e.message : "Failed to load downline.",
      }));
    } finally {
      setDownlineLoading((prev) => ({ ...prev, [parentId]: false }));
    }
  };

  const exportPlayersCsv = useCallback(() => {
    const header = [
      "User ID",
      "Username",
      "User code",
      "Status",
      "Betting locked",
      "Net exposure",
      "Take",
      "Give",
      "Balance",
      "Credit limit",
    ];
    const out = rows.map((row) => {
      const bal = row.balanceInfo as Record<string, unknown> | undefined;
      const bettingLockRaw = row.bettingLock ?? bal?.bettingLock;
      const bettingLocked =
        bettingLockRaw === true ||
        bettingLockRaw === 1 ||
        String(bettingLockRaw).toLowerCase() === "true";
      const { text: statusText } = rowStatusLabel(row.status);
      return [
        String(row.id ?? ""),
        String(row.username ?? ""),
        String(row.userCode ?? ""),
        statusText,
        bettingLocked ? "Yes" : "No",
        Number(bal?.exposure ?? row.exposure ?? row.netExposure ?? 0),
        Number(bal?.take ?? row.take ?? 0),
        Number(bal?.give ?? row.give ?? 0),
        Number(bal?.balance ?? row.balance ?? 0),
        Number(bal?.creditLimit ?? row.creditLimit ?? 0),
      ];
    });
    downloadCsv(`players-${new Date().toISOString().slice(0, 10)}.csv`, header, out);
  }, [rows]);

  const openCreditModal = (userId: string, username: string) => {
    setCreditMode("D");
    setCreditAmount("");
    setCreditRemarks("");
    setCreditSubmitError(null);
    setCreditModal({ open: true, userId, username });
  };

  const closeCreditModal = () => {
    if (creditSaving) return;
    setCreditModal((prev) => ({ ...prev, open: false }));
  };

  const saveCredit = async () => {
    const userId = creditModal.userId;
    if (!userId) return;
    const chips = Number(creditAmount);
    if (!Number.isFinite(chips) || chips <= 0) {
      setCreditSubmitError("Enter a valid amount greater than zero.");
      return;
    }
    if (creditMode === "W" && !creditRemarks.trim()) {
      setCreditSubmitError("Remarks are required for withdraw (comment).");
      return;
    }
    setCreditSubmitError(null);
    const timestamp = timestampMs();
    setCreditSaving(true);
    try {
      if (creditMode === "D") {
        await deposit(
          {
            isTransfer: true,
            chips,
            userId,
            dwType: "D",
            timestamp,
            ...(creditRemarks.trim() ? { comment: creditRemarks.trim() } : {}),
          },
          { showSuccessToast: true },
        );
      } else {
        await withdraw(
          {
            isTransfer: true,
            chips,
            userId,
            dwType: "W",
            comment: creditRemarks.trim(),
            timestamp,
          },
          { showSuccessToast: true },
        );
      }
      setCreditModal((prev) => ({ ...prev, open: false }));
      setCreditAmount("");
      setCreditRemarks("");
      loadDownline();
    } catch {
      /* global mutation toast on error */
    } finally {
      setCreditSaving(false);
    }
  };

  const openBetConfigModal = async (userId: string, username: string) => {
    setBetConfigError(null);
    setBetConfigLoading(true);
    setBetConfigRows([]);
    setBetConfigModal({ open: true, userId, username });
    try {
      const allEventTypes = eventTypes ?? (await getEventType());
      if (!eventTypes) setEventTypes(allEventTypes);
      const raw = await getUserById(userId);
      const env = raw as { success?: boolean; data?: unknown; messages?: unknown };
      const data = (env && typeof env === "object" && "data" in env ? env.data : raw) as {
        betConfigs?: BetConfigApiRow[];
      };
      const apiRows = Array.isArray(data?.betConfigs) ? data.betConfigs : [];
      setBetConfigRows(buildRowsFromApi(apiRows, allEventTypes));
    } catch (e) {
      setBetConfigError(e instanceof Error ? e.message : "Failed to load user bet config.");
    } finally {
      setBetConfigLoading(false);
    }
  };

  const closeBetConfigModal = () => {
    if (betConfigSaving) return;
    setBetConfigModal((prev) => ({ ...prev, open: false }));
  };

  const toggleBetConfigRow = (key: string) => {
    setBetConfigRows((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, enabled: !row.enabled } : row,
      ),
    );
  };

  const updateBetConfigRowField = (
    key: string,
    field: keyof Omit<BetConfigRow, "key" | "label" | "enabled">,
    value: string,
  ) => {
    setBetConfigRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  };

  const persistBetConfig = async (applyAll: boolean) => {
    const userId = betConfigModal.userId;
    const built = buildUpdateBetConfigPayload(userId, betConfigRows, applyAll);
    if (!built.ok) {
      setBetConfigError(built.error);
      return;
    }
    setBetConfigError(null);
    setBetConfigSaving(true);
    try {
      await updateBetConfig(built.body, { showSuccessToast: true });
      setBetConfigModal((prev) => ({ ...prev, open: false }));
      loadDownline();
    } catch {
      /* global mutation toast on error */
    } finally {
      setBetConfigSaving(false);
    }
  };

  const applyBetConfigToAllChild = () => {
    void persistBetConfig(true);
  };

  const saveBetConfig = async () => {
    await persistBetConfig(false);
  };

  const openCommissionModal = async (userId: string, username: string) => {
    setCommissionModal({ open: true, userId, username });
    setCommissionError(null);
    setCommissionLoading(true);
    setCommissionValues(defaultCommissionValues());
    try {
      const raw = await getUserById(userId);
      setCommissionValues(readCommissionValuesFromUser(raw));
    } catch (e) {
      setCommissionError(
        e instanceof Error ? e.message : "Failed to load commission.",
      );
    } finally {
      setCommissionLoading(false);
    }
  };

  const closeCommissionModal = () => {
    if (commissionSaving || commissionLoading) return;
    setCommissionModal((prev) => ({ ...prev, open: false }));
  };

  const updateCommissionValue = (key: CommissionFieldKey, value: string) => {
    setCommissionValues((prev) => ({ ...prev, [key]: value }));
  };

  const saveCommission = async () => {
    if (!commissionModal.userId) return;
    setCommissionError(null);
    setCommissionSaving(true);
    try {
      const commissions = COMMISSION_FIELDS.map((field) => ({
        percentage: commissionValues[field.key] || "0",
        bettingType: COMMISSION_BETTING_TYPE[field.key],
        commissionOn: "2",
        commissionType: "2",
        superAdminShare: 100,
        adminShare: 0,
        superMasterShare: 0,
        masterShare: 0,
        agentShare: 0,
      }));
      await setCommission({
        id: commissionModal.userId,
        commissions,
        applyAll: false,
      });
      setCommissionModal((prev) => ({ ...prev, open: false }));
      // Refresh player table values after successful update.
      loadDownline();
    } catch (e) {
      setCommissionError(
        e instanceof Error ? e.message : "Failed to save commission.",
      );
    } finally {
      setCommissionSaving(false);
    }
  };

  const openReferralSettingsModal = async (userId: string, username: string) => {
    const uid = userId.trim();
    if (!uid) return;
    setReferralModal({ open: true, userId: uid, username: username.trim() });
    setReferralError(null);
    setReferralLoading(true);
    setReferralForm({
      bonus: "0",
      lockingDays: "0",
      minDeposit: "0",
      minWithdrawalAmount: "0",
      minimumBalanceRequired: "0",
    });
    try {
      const d = await getReferralSetting(uid);
      setReferralForm({
        bonus: String(d?.bonus ?? "0"),
        lockingDays: String(d?.lockingDays ?? "0"),
        minDeposit: String(d?.minDeposit ?? "0"),
        minWithdrawalAmount: String(d?.minWithdrawalAmount ?? "0"),
        minimumBalanceRequired: String(d?.minimumBalanceRequired ?? "0"),
      });
    } catch (e) {
      setReferralError(
        e instanceof Error ? e.message : "Failed to load referral settings.",
      );
    } finally {
      setReferralLoading(false);
    }
  };

  const closeReferralSettingsModal = () => {
    if (referralSaving) return;
    setReferralModal((prev) => ({ ...prev, open: false }));
  };

  const updateReferralFormField = (key: keyof ReferralSettingsFormState, value: string) => {
    setReferralForm((prev) => ({ ...prev, [key]: value }));
  };

  const persistReferralSettings = async (applyAll: boolean) => {
    const userId = referralModal.userId.trim();
    if (!userId) return;
    const bonus = Number(referralForm.bonus);
    const lockingDays = Number(referralForm.lockingDays);
    const minDeposit = Number(referralForm.minDeposit);
    const minWithdrawalAmount = Number(referralForm.minWithdrawalAmount);
    const minimumBalanceRequired = Number(referralForm.minimumBalanceRequired);
    if (
      !Number.isFinite(bonus) ||
      !Number.isFinite(lockingDays) ||
      !Number.isFinite(minDeposit) ||
      !Number.isFinite(minWithdrawalAmount) ||
      !Number.isFinite(minimumBalanceRequired)
    ) {
      setReferralError("Enter valid numbers.");
      return;
    }
    setReferralError(null);
    setReferralSaving(true);
    try {
      await updateReferralSetting({
        userId,
        applyAll,
        bonus,
        lockingDays,
        minDeposit,
        minWithdrawalAmount,
        minimumBalanceRequired,
      });
      setReferralModal((prev) => ({ ...prev, open: false }));
      loadDownline();
    } catch (e) {
      setReferralError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setReferralSaving(false);
    }
  };

  const openQuickEditModal = async (
    userId: string,
    usernameValue: string,
    userCodeValue: string,
  ) => {
    if (!userId) return;
    setQuickEditModal({
      open: true,
      userId,
      username: usernameValue,
      userCode: userCodeValue,
      loading: true,
      saving: false,
      error: null,
      mobile: "",
      pt: "",
      password: "",
      repeatPassword: "",
      status: "active",
      notes: "",
    });

    try {
      const raw = await getUserById(userId);
      const user = unwrapUserPayload(raw);
      setQuickEditModal((prev) => ({
        ...prev,
        loading: false,
        error: null,
        username: String(user.username ?? user.userName ?? usernameValue ?? "").trim(),
        userCode: String(user.userCode ?? user.code ?? userCodeValue ?? "").trim(),
        mobile: String(
          user.mobile ?? user.phone ?? user.phoneNumber ?? "",
        ).trim(),
        pt: String(user.pt ?? user.point ?? user.pts ?? "").trim(),
        status: toQuickEditStatus(user.status),
        notes: String(user.notes ?? user.note ?? user.remark ?? "").trim(),
      }));
    } catch (e) {
      setQuickEditModal((prev) => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load player details.",
      }));
    }
  };

  const closeQuickEditModal = () => {
    if (quickEditModal.loading || quickEditModal.saving) return;
    setQuickEditModal((prev) => ({ ...prev, open: false }));
  };

  const saveQuickEditModal = async () => {
    if (!quickEditModal.userId) return;
    const password = quickEditModal.password.trim();
    const repeatPassword = quickEditModal.repeatPassword.trim();
    if (password || repeatPassword) {
      if (!password || !repeatPassword || password !== repeatPassword) {
        setQuickEditModal((prev) => ({
          ...prev,
          error: "Password and repeat password must match.",
        }));
        return;
      }
    }

    setQuickEditModal((prev) => ({ ...prev, saving: true, error: null }));
    try {
      const payload: Record<string, unknown> = {
        id: quickEditModal.userId,
        mobile: quickEditModal.mobile.trim(),
        phone: quickEditModal.mobile.trim(),
        pt: quickEditModal.pt.trim(),
        status: toApiStatus(quickEditModal.status),
        notes: quickEditModal.notes.trim(),
        remark: quickEditModal.notes.trim(),
      };
      if (password) {
        payload.password = password;
      }
      await updateMember(payload);
      setQuickEditModal((prev) => ({
        ...prev,
        open: false,
        saving: false,
        password: "",
        repeatPassword: "",
      }));
      loadDownline();
    } catch (e) {
      setQuickEditModal((prev) => ({
        ...prev,
        saving: false,
        error: e instanceof Error ? e.message : "Failed to save player information.",
      }));
    }
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader title="Players" breadcrumbs={["Players"]} />

      <ListPageFrame>
        {error && (
          <p className="px-5 pt-4 text-sm text-error" role="alert">
            {error}
          </p>
        )}

        <div className="flex w-full flex-col justify-center gap-0">
          <ListFilterPanel
            mobileToggle={{
              onClick: () => setShowMoreFilters((v) => !v),
              label: "Show Filters",
            }}
          >
            <div className="hidden sm:grid flex-1 gap-3 bg-neutral-200 px-5 pb-4 pt-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <input
                  placeholder="Search username"
                  value={username}
                  onChange={(e) => {
                    setPage(1);
                    setUsername(e.target.value);
                  }}
                  className="min-w-[8rem] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm sm:min-w-[12rem]"
                />

                {showMoreFilters ? (
                  <>
                    <input
                      placeholder="User code"
                      value={userCode}
                      onChange={(e) => {
                        setPage(1);
                        setUserCode(e.target.value);
                      }}
                      className="min-w-[8rem] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm sm:min-w-[12rem]"
                    />
                  </>
                ) : (
                  <>
                    <div className="hidden lg:block" />
                    <div className="hidden lg:block" />
                  </>
                )}

                <div className="flex flex-wrap gap-2 sm:col-span-full md:col-span-2">
                  <div className="flex justify-center gap-2 sm:flex-none">
                    <button
                      type="button"
                      onClick={() => {
                        setPage(1);
                        loadDownline();
                      }}
                      className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white"
                    >
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMoreFilters((v) => !v)}
                      className="flex h-9 max-w-max items-center rounded-md bg-primary px-4 text-sm font-medium text-white"
                    >
                      <span className="mr-2 text-xl">
                        <Filter className="h-4 w-4" aria-hidden />
                      </span>
                      More Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => exportPlayersCsv()}
                      className="flex h-9 max-w-max items-center rounded-md bg-primary px-4 text-sm font-medium text-white"
                    >
                      <span className="mr-2 text-xl">
                        <Download className="h-4 w-4" aria-hidden />
                      </span>
                      Export
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateMemberOpen(true)}
                      className="flex h-9 max-w-max items-center rounded-md bg-primary px-4 text-sm font-medium text-white"
                    >
                      {createMemberButtonLabel}
                    </button>
                  </div>
                </div>
              </div>
          </ListFilterPanel>

        {/* Table */}
        <ListTableSection>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">No players yet.</div>
          ) : (
            <Table className="w-full min-w-max rounded-lg">
              <TableHeader className="w-full bg-white text-xs font-semibold text-foreground-secondary">
                <TableHead className="!px-4 !py-3 !text-left">Username</TableHead>
                <TableHead className="!px-4 !py-3 !text-left">Downline</TableHead>
                <TableHead className="!px-4 !py-3 !text-center">Betting Status</TableHead>
                <TableHead className="!px-4 !py-3 !text-center">Status</TableHead>
                <TableHead className="!px-4 !py-3 !text-left">Details</TableHead>
                <TableHead className="!px-4 !py-3 !text-right">Net Exposure</TableHead>
                <TableHead className="!px-4 !py-3 !text-right">Take</TableHead>
                <TableHead className="!px-4 !py-3 !text-right">Give</TableHead>
                <TableHead className="!px-4 !py-3 !text-right">Balance</TableHead>
                <TableHead className="!px-4 !py-3 !text-right">ATB</TableHead>
                <TableHead className="!px-4 !py-3 !text-right">Credit Limit</TableHead>
                <TableHead className="!px-4 !py-3 !text-center">Actions</TableHead>
              </TableHeader>
              <TableBody>
                  {rows.map((row) => {
                    const id = String(row.id ?? "");
                    const uname = String(row.username ?? "—");
                    const userCode = String(row.userCode ?? "—");
                    const { text: statusText, active: statusActive } = rowStatusLabel(row.status);
                    const userType = Number(row.userType ?? 0);
                    const isLeafUser = userType === 5;
                    const bal = row.balanceInfo as Record<string, unknown> | undefined;
                    const exposure = Number(
                      bal?.exposure ?? row.exposure ?? row.netExposure ?? 0,
                    );
                    const take = Number(bal?.take ?? row.take ?? 0);
                    const give = Number(bal?.give ?? row.give ?? 0);
                    const balance = Number(bal?.balance ?? row.balance ?? 0);
                    const creditLimit = Number(
                      bal?.creditLimit ?? row.creditLimit ?? 0,
                    );
                    const bettingLockRaw = row.bettingLock ?? bal?.bettingLock;
                    const bettingLocked =
                      bettingLockRaw === true ||
                      bettingLockRaw === 1 ||
                      String(bettingLockRaw).toLowerCase() === "true";
                    const mobile = String(row.mobile ?? "");

                    const isExpanded = Boolean(expandedRows[id]);

                    return (
                      <Fragment key={id || uname}>
                        <TableRow>
                        <TableCell className="!px-4 !py-4 text-foreground">
                          <div>
                            {id ? (
                              <button
                                type="button"
                                onClick={() => void openQuickEditModal(id, uname, userCode)}
                                className="text-primary hover:underline"
                              >
                                {uname}
                              </button>
                            ) : (
                              uname
                            )}
                          </div>
                          <div className="text-xs text-muted">
                            {mobile || userCode ? (
                              id ? (
                                <button
                                  type="button"
                                  onClick={() => void openQuickEditModal(id, uname, userCode)}
                                  className="text-primary hover:underline"
                                >
                                  ({mobile || userCode})
                                </button>
                              ) : (
                                `(${mobile || userCode})`
                              )
                            ) : (
                              "—"
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="!px-4 !py-4 text-foreground">
                          {!isLeafUser && id ? (
                            <button
                              type="button"
                              onClick={() => void toggleDownline(id)}
                              className={`inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-2 ${
                                isExpanded
                                  ? "border-primary/50 bg-primary/10 text-primary"
                                  : "border-border"
                              }`}
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? "Hide downline" : "Show downline"}
                            >
                              <Network className="h-4 w-4 shrink-0" aria-hidden />
                            </button>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </TableCell>
                        <TableCell className="!px-4 !py-4 text-center">
                          <button
                            type="button"
                            disabled={!id}
                            onClick={() =>
                              openBettingLockConfirm(
                                id,
                                userCode !== "—" ? userCode : uname,
                                bettingLocked,
                              )
                            }
                            className="inline-flex items-center justify-center gap-1 rounded-sm p-0.5 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              bettingLocked
                                ? "Click to unlock betting"
                                : "Click to lock betting"
                            }
                            aria-label={
                              bettingLocked
                                ? `Confirm unlock betting for ${uname}`
                                : `Confirm lock betting for ${uname}`
                            }
                          >
                            {bettingLocked ? (
                              <Lock className="h-4 w-4 text-red-600" aria-hidden />
                            ) : (
                              <LockOpen className="h-4 w-4 text-[#2f9e44]" aria-hidden />
                            )}
                            <span className="sr-only">{bettingLocked ? "Locked" : "Open"}</span>
                          </button>
                        </TableCell>
                        <TableCell className="!px-4 !py-4 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                              statusActive
                                ? "bg-[#d3f9d8] text-[#2f9e44]"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {statusText}
                          </span>
                        </TableCell>
                        <TableCell className="!px-4 !py-4 text-left text-sm text-primary">
                        {id ? (
                              <Link
                                href={`/players/${encodeURIComponent(id)}`}
                                className="rounded-sm p-0.5 hover:bg-info-subtle text-primary"
                                aria-label="View player"
                              >
                                <Eye className="h-4 w-4" aria-hidden />
                              </Link>
                            ) : null}
                        </TableCell>
                        <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(exposure ?? 0))}`}>
                          {formatCurrency(exposure)}
                        </TableCell>
                        <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(take ?? 0))}`}>
                          {formatCurrency(take)}
                        </TableCell>
                        <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(give ?? 0))}`}>
                          {formatCurrency(give)}
                        </TableCell>
                        <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(balance ?? 0))}`}>
                          {formatCurrency(balance)}
                        </TableCell>
                        <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(balance + exposure))}`}>
                          {formatCurrency(balance + exposure)}
                        </TableCell>
                        <TableCell className={`!px-4 !py-4 text-right tabular-nums ${signedAmountTextClass(Number(creditLimit ?? 0))}`}>
                          {formatCurrency(creditLimit)}
                        </TableCell>
                        <TableCell className="!px-4 !py-4 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1 text-primary">
                            <button
                              type="button"
                              onClick={() => openCreditModal(id, uname)}
                              className="rounded-sm p-0.5 hover:bg-info-subtle"
                              aria-label="Open credit popup"
                            >
                              <Landmark className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => openBetConfigModal(id, uname)}
                              className="rounded-sm p-0.5 hover:bg-info-subtle"
                              aria-label="Open bet configuration popup"
                            >
                              <Code2 className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => void openCommissionModal(id, uname)}
                              className="rounded-sm p-0.5 hover:bg-info-subtle"
                              aria-label="Open commission popup"
                            >
                              <Percent className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => void openReferralSettingsModal(id, uname)}
                              className="rounded-sm p-0.5 hover:bg-info-subtle"
                              aria-label="Open referral settings"
                            >
                              <Settings className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && !isLeafUser && id ? (
                        <DownlineExpansionRows
                          parentId={id}
                          depth={1}
                          expandedRows={expandedRows}
                          downlineRows={downlineRows}
                          downlineLoading={downlineLoading}
                          downlineError={downlineError}
                          toggleDownline={toggleDownline}
                          openQuickEditModal={openQuickEditModal}
                          openBettingLockConfirm={openBettingLockConfirm}
                          openCreditModal={openCreditModal}
                          openBetConfigModal={openBetConfigModal}
                          openCommissionModal={openCommissionModal}
                          openReferralSettingsModal={openReferralSettingsModal}
                        />
                      ) : null}
                      </Fragment>
                    );
                  })}
              </TableBody>
            </Table>
          )}
          <TablePagination
            page={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPage(1);
              setPageSize(size);
            }}
            pageSizeOptions={[15, 30, 50, 100, 200]}
          />
        </ListTableSection>
        </div>
      </ListPageFrame>
      <PlayerQuickEditModal
        state={quickEditModal}
        onClose={closeQuickEditModal}
        onChange={(patch) => setQuickEditModal((prev) => ({ ...prev, ...patch }))}
        onSave={() => void saveQuickEditModal()}
      />
      <CreditActionModal
        state={creditModal}
        mode={creditMode}
        amount={creditAmount}
        remarks={creditRemarks}
        saving={creditSaving}
        submitError={creditSubmitError}
        onClose={closeCreditModal}
        onModeChange={(m) => {
          setCreditSubmitError(null);
          setCreditMode(m);
        }}
        onAmountChange={(v) => {
          setCreditSubmitError(null);
          setCreditAmount(v);
        }}
        onRemarksChange={(v) => {
          setCreditSubmitError(null);
          setCreditRemarks(v);
        }}
        onSave={() => void saveCredit()}
      />
      <BetConfigModal
        state={betConfigModal}
        rows={betConfigRows}
        loading={betConfigLoading}
        error={betConfigError}
        saving={betConfigSaving}
        onClose={closeBetConfigModal}
        onToggle={toggleBetConfigRow}
        onFieldChange={updateBetConfigRowField}
        onApplyToAllChild={applyBetConfigToAllChild}
        onSave={() => void saveBetConfig()}
      />
      <CommissionModal
        state={commissionModal}
        values={commissionValues}
        loading={commissionLoading}
        error={commissionError}
        saving={commissionSaving}
        onClose={closeCommissionModal}
        onFieldChange={updateCommissionValue}
        onSave={() => void saveCommission()}
      />
      <ReferralSettingsModal
        state={referralModal}
        form={referralForm}
        loading={referralLoading}
        error={referralError}
        saving={referralSaving}
        onClose={closeReferralSettingsModal}
        onFieldChange={updateReferralFormField}
        onApplyAll={() => void persistReferralSettings(true)}
        onSave={() => void persistReferralSettings(false)}
      />
      <Modal
        isOpen={bettingLockConfirm.open}
        onClose={closeBettingLockConfirm}
        title="Confirm"
        maxWidthClassName="max-w-md"
        bodyClassName={DIALOG_BODY_COMPACT}
        footer={
          <DialogActions>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={bettingLockConfirm.saving}
              onClick={() => void confirmBettingLockChange()}
            >
              {bettingLockConfirm.saving ? "…" : "Proceed"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={bettingLockConfirm.saving}
              onClick={closeBettingLockConfirm}
            >
              Reject
            </Button>
          </DialogActions>
        }
      >
        <DialogSection>
          <p className="text-sm text-foreground">
            Are you sure you want to {bettingLockConfirm.nextLocked ? "lock" : "unlock"}
            <span className="font-semibold">{bettingLockConfirm.label}</span>?
          </p>
          {bettingLockConfirm.error ? (
            <p className="text-sm text-error" role="alert">
              {bettingLockConfirm.error}
            </p>
          ) : null}
        </DialogSection>
      </Modal>
      <CreateMemberModal
        open={createMemberOpen}
        onClose={() => setCreateMemberOpen(false)}
        parentId={createMemberParentId}
        onCreated={() => {
          setPage(1);
          loadDownline();
        }}
      />
    </div>
  );
}
