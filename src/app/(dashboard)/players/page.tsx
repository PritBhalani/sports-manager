"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  PageHeader,
  Card,
  Button,
  DialogActions,
  DialogFormRow,
  DialogSection,
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
  ChevronRight,
  ChevronDown,
  Loader2,
  LockOpen,
  Landmark,
  Code2,
  Percent,
  Settings,
} from "lucide-react";
import { getDownline } from "@/services/account.service";
import { getSessionMemberId, getUserById, setCommission } from "@/services/user.service";
import { formatDateTime } from "@/utils/date";
import type { DownlineRecord } from "@/types/account.types";
import { getEventType, type EventTypeRecord } from "@/services/eventtype.service";
import { formatCurrency } from "@/utils/formatCurrency";

/** Map UI filter to API `searchQuery.status` (empty = no filter / all). */
function statusForPlayerType(playerType: string): string {
  if (playerType === "inactive") return "-1";
  if (playerType === "active") return "2";
  return "";
}

function rowStatusLabel(status: unknown): { text: string; active: boolean } {
  const n = typeof status === "number" ? status : Number(status);
  if (n === 2 || n === 1) return { text: "ACTIVE", active: true };
  if (n === -1 || Number.isNaN(n)) return { text: "INACTIVE", active: false };
  return { text: String(status ?? "—"), active: false };
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

function CreditActionModal({
  state,
  mode,
  amount,
  remarks,
  saving,
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
      footer={
        <DialogActions>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      }
    >
      <DialogSection>
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
            D
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
            W
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
      bodyClassName="p-3 sm:p-4"
      footer={
        <DialogActions>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onApplyToAllChild} disabled={saving}>
            Apply To All Child
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
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
      footer={
        <DialogActions>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading || saving}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onSave} disabled={loading || saving}>
            {saving ? "Saving..." : "Save"}
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

export default function PlayersPage() {
  const [username, setUsername] = useState("");
  const [userCode, setUserCode] = useState("");
  const [playerType, setPlayerType] = useState("all");
  const [rows, setRows] = useState<DownlineRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
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
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [downlineRows, setDownlineRows] = useState<Record<string, DownlineRecord[]>>({});
  const [downlineLoading, setDownlineLoading] = useState<Record<string, boolean>>({});
  const [downlineError, setDownlineError] = useState<Record<string, string | null>>({});

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
        setDownlineRows({});
        setDownlineLoading({});
        setDownlineError({});
      })
      .catch((e) => {
        setRows([]);
        setTotal(0);
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
    if (currentlyOpen) {
      setExpandedRows((prev) => ({ ...prev, [parentId]: false }));
      return;
    }

    setExpandedRows((prev) => ({ ...prev, [parentId]: true }));
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

  const openCreditModal = (userId: string, username: string) => {
    setCreditMode("D");
    setCreditAmount("");
    setCreditRemarks("");
    setCreditModal({ open: true, userId, username });
  };

  const closeCreditModal = () => {
    if (creditSaving) return;
    setCreditModal((prev) => ({ ...prev, open: false }));
  };

  const saveCredit = async () => {
    // Placeholder for transfer/credit API wiring.
    setCreditSaving(true);
    try {
      setCreditModal((prev) => ({ ...prev, open: false }));
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

  const applyBetConfigToAllChild = () => {
    // Placeholder for "apply to all child" backend action.
  };

  const saveBetConfig = async () => {
    // Placeholder for bet configuration save API wiring.
    setBetConfigSaving(true);
    try {
      setBetConfigModal((prev) => ({ ...prev, open: false }));
    } finally {
      setBetConfigSaving(false);
    }
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

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <PageHeader title="Players" breadcrumbs={["Players"]} />

      <Card>
        {error && (
          <p className="mb-2 text-sm text-error" role="alert">
            {error}
          </p>
        )}

        {/* Filters row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => {
              setPage(1);
              setUsername(e.target.value);
            }}
            className="h-10"
          />
          <Select
            aria-label="Player type"
            value={playerType}
            onChange={(e) => {
              setPage(1);
              setPlayerType(e.target.value);
            }}
            options={[
              { label: "All Players", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
            className="h-10"
          />
          <Input
            placeholder="User code"
            value={userCode}
            onChange={(e) => {
              setPage(1);
              setUserCode(e.target.value);
            }}
            className="h-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5 sm:gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Filter className="h-4 w-4" aria-hidden />}
              onClick={() => {
                setPage(1);
                loadDownline();
              }}
            >
              Apply filters
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Download className="h-4 w-4" aria-hidden />}
            >
              Export
            </Button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
            <Button type="button" variant="outline" size="sm">
              KYC
            </Button>
            <Link
              href="/players/add"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-sm border-transparent bg-primary px-3 text-xs font-medium text-white transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Create
            </Link>
          </div>
        </div>

        {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">
              No players yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-surface">
                  <TableHead className="font-bold text-foreground/80">Username</TableHead>
                  <TableHead className="font-bold text-foreground/80">Downline</TableHead>
                  <TableHead className="font-bold text-foreground/80">Betting Status</TableHead>
                  <TableHead className="font-bold text-foreground/80">Status</TableHead>
                  <TableHead className="font-bold text-foreground/80">Details</TableHead>
                  <TableHead className="font-bold text-foreground/80">Net Exposure</TableHead>
                  <TableHead className="font-bold text-foreground/80">Take</TableHead>
                  <TableHead className="font-bold text-foreground/80">Give</TableHead>
                  <TableHead className="font-bold text-foreground/80">Balance</TableHead>
                  <TableHead className="font-bold text-foreground/80">Credit Limit</TableHead>
                  <TableHead className="font-bold text-foreground/80">Available Credit</TableHead>
                  <TableHead className="font-bold text-foreground/80">Actions</TableHead>
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
                    const availableCredit = Number(
                      bal?.availableCredit ?? row.availableCredit ?? 0,
                    );
                    const lastIp = String(row.remoteIp ?? row.ip ?? row.lastIp ?? "—");
                    const mobile = String(row.mobile ?? "");

                    const isExpanded = Boolean(expandedRows[id]);
                    const childRows = downlineRows[id] ?? [];
                    const childLoading = Boolean(downlineLoading[id]);
                    const childError = downlineError[id];

                    return (
                      <Fragment key={id || uname}>
                      <TableRow>
                        <TableCell className="text-foreground">
                          <div>
                            {id ? (
                              <Link
                                href={`/players/${id}`}
                                className="text-primary hover:underline"
                              >
                                {uname}
                              </Link>
                            ) : (
                              uname
                            )}
                          </div>
                          <div className="text-xs text-muted">
                            {mobile || userCode ? (
                              id ? (
                                <Link
                                  href={`/players/${id}`}
                                  className="text-primary hover:underline"
                                >
                                  ({mobile || userCode})
                                </Link>
                              ) : (
                                `(${mobile || userCode})`
                              )
                            ) : (
                              "—"
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isLeafUser ? (
                            <span className="text-muted">-</span>
                          ) : id ? (
                            <button
                              type="button"
                              onClick={() => void toggleDownline(id)}
                              className="inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-muted hover:bg-surface-2 hover:text-foreground"
                              aria-label={isExpanded ? "Collapse downline" : "Expand downline"}
                              title={isExpanded ? "Collapse downline" : "Expand downline"}
                            >
                              {childLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : isExpanded ? (
                                <ChevronDown className="h-4 w-4" aria-hidden />
                              ) : (
                                <ChevronRight className="h-4 w-4" aria-hidden />
                              )}
                            </button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <LockOpen className="h-4 w-4 text-muted" aria-hidden />
                        </TableCell>
                        <TableCell className={statusActive ? "text-success" : "text-error"}>
                          {statusText}
                        </TableCell>
                        <TableCell>
                          {id ? (
                            <Link href={`/players/${encodeURIComponent(id)}`} className="text-primary hover:underline">
                              <Eye className="h-4 w-4" aria-hidden />
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums text-foreground">
                          {formatCurrency(exposure)}
                        </TableCell>
                        <TableCell className="tabular-nums text-foreground">
                          {formatCurrency(take)}
                        </TableCell>
                        <TableCell className="tabular-nums text-foreground">
                          {formatCurrency(give)}
                        </TableCell>
                        <TableCell className="tabular-nums text-foreground">
                          {formatCurrency(balance)}
                        </TableCell>
                        <TableCell className="tabular-nums text-foreground">
                          {formatCurrency(creditLimit)}
                        </TableCell>
                        <TableCell className="tabular-nums text-foreground">
                          {formatCurrency(availableCredit)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-primary">
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
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && !isLeafUser ? (
                        childLoading ? (
                          <TableRow>
                            <td colSpan={15} className="px-4 py-3 text-sm text-muted">
                              Loading downline...
                            </td>
                          </TableRow>
                        ) : childError ? (
                          <TableRow>
                            <td colSpan={15} className="px-4 py-3 text-sm text-error">
                              {childError}
                            </td>
                          </TableRow>
                        ) : childRows.length === 0 ? (
                          <TableRow>
                            <td colSpan={15} className="px-4 py-3 text-sm text-muted">
                              No downline users.
                            </td>
                          </TableRow>
                        ) : (
                          childRows.map((child, idx) => {
                            const cId = String(child.id ?? `${id}-${idx}`);
                            const cUname = String(child.username ?? "—");
                            const cStatus = rowStatusLabel(child.status);
                            const cBal =
                              child.balanceInfo as Record<string, unknown> | undefined;
                            const cExposure = Number(
                              cBal?.exposure ?? child.exposure ?? child.netExposure ?? 0,
                            );
                            const cTake = Number(cBal?.take ?? child.take ?? 0);
                            const cGive = Number(cBal?.give ?? child.give ?? 0);
                            const cBalance = Number(cBal?.balance ?? child.balance ?? 0);
                            const cCreditLimit = Number(
                              cBal?.creditLimit ?? child.creditLimit ?? 0,
                            );
                            const cAvailableCredit = Number(
                              cBal?.availableCredit ?? child.availableCredit ?? 0,
                            );
                            const cLastIp = String(
                              child.remoteIp ?? child.ip ?? child.lastIp ?? "—",
                            );
                            const cMobile = String(child.mobile ?? "");
                            return (
                              <TableRow key={cId} className="bg-surface-2/70">
                                <TableCell className="pl-8 text-foreground">
                                  <div>
                                    {cId ? (
                                      <Link
                                        href={`/players/${cId}`}
                                        className="text-primary hover:underline"
                                      >
                                        {cUname}
                                      </Link>
                                    ) : (
                                      cUname
                                    )}
                                  </div>
                                  <div className="text-xs text-muted">
                                    {cMobile ? `(${cMobile})` : "—"}
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted">—</TableCell>
                                <TableCell>
                                  <LockOpen className="h-4 w-4 text-muted" aria-hidden />
                                </TableCell>
                                <TableCell className={cStatus.active ? "text-success" : "text-error"}>
                                  {cStatus.text}
                                </TableCell>
                                <TableCell>
                                  {cId ? (
                                    <Link href={`/players/${encodeURIComponent(cId)}`} className="text-primary hover:underline">
                                      <Eye className="h-4 w-4" aria-hidden />
                                    </Link>
                                  ) : (
                                    "—"
                                  )}
                                </TableCell>
                                <TableCell className="tabular-nums text-success">
                                  {formatCurrency(cExposure)}
                                </TableCell>
                                <TableCell className="tabular-nums text-success">
                                  {formatCurrency(cTake)}
                                </TableCell>
                                <TableCell className="tabular-nums text-error">
                                  {formatCurrency(cGive)}
                                </TableCell>
                                <TableCell className="tabular-nums text-foreground">
                                  {formatCurrency(cBalance)}
                                </TableCell>
                                <TableCell className="tabular-nums text-foreground">
                                  {formatCurrency(cCreditLimit)}
                                </TableCell>
                                <TableCell className="tabular-nums text-foreground">
                                  {formatCurrency(cAvailableCredit)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 text-primary">
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
                                    <Settings className="h-4 w-4" aria-hidden />
                                  </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-xs text-foreground/80">
                                  {formatDateTime(child.createdOn)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-xs text-foreground/80">
                                  {formatDateTime(child.lastLogin)}
                                </TableCell>
                                <TableCell className="text-foreground/80">{cLastIp}</TableCell>
                              </TableRow>
                            );
                          })
                        )
                      ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
        </div>
      </Card>
      <CreditActionModal
        state={creditModal}
        mode={creditMode}
        amount={creditAmount}
        remarks={creditRemarks}
        saving={creditSaving}
        onClose={closeCreditModal}
        onModeChange={setCreditMode}
        onAmountChange={setCreditAmount}
        onRemarksChange={setCreditRemarks}
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
    </div>
  );
}
