"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  PageHeader,
  Card,
  Button,
  Dialog,
  Input,
  Select,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components";
import { usePagination } from "@/hooks/usePagination";
import {
  addAgentOffer,
  deleteAgentOffer,
  getAgentOffers,
  updateAgentOffer,
  type AgentOffer,
  type UpsertAgentOfferPayload,
} from "@/services/offer.service";
import { getAuthSession } from "@/store/authStore";

function formatOfferDate(date: string): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function mapOfferOn(value: number): string {
  if (value === 1) return "OnFirstDeposit";
  if (value === 2) return "OnDeposit";
  if (value === 3) return "OnRegister";
  if (value === 4) return "OnSecondDeposit";
  if (value === 5) return "OnThirdDeposit";
  return String(value || "-");
}

function mapOfferType(value: number): string {
  if (value === 1) return "Fixed";
  if (value === 2) return "Percentage";
  return String(value || "-");
}

type VariationFormRow = { min: string; max: string; percentage: string };
type OfferFormState = {
  title: string;
  startDate: string;
  endDate: string;
  displayOrder: string;
  isCodeRequired: boolean;
  turnover: string;
  withdrawalTurnover: string;
  offerOn: string;
  offerType: string;
  description: string;
  bonusCode: string;
  bonusExpiredDay: string;
  splitBonus: string;
  maxUser: string;
  offerBudget: string;
  value: string;
  minDeposit: string;
  maxDeposit: string;
  variations: VariationFormRow[];
};

const OFFER_ON_OPTIONS = [
  { value: "1", label: "OnFirstDeposit" },
  { value: "2", label: "OnDeposit" },
  { value: "3", label: "OnRegister" },
  { value: "4", label: "OnSecondDeposit" },
  { value: "5", label: "OnThirdDeposit" },
];
const OFFER_TYPE_OPTIONS = [
  { value: "1", label: "Fixed" },
  { value: "2", label: "Percentage" },
];

function toDateTimeLocal(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function numberToUiString(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const normalized = Number(value.toFixed(6));
  return String(normalized);
}

function getNowDateTimeLocal(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hour = pad(now.getHours());
  const minute = pad(now.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function defaultFormState(): OfferFormState {
  return {
    title: "",
    startDate: "",
    endDate: "",
    displayOrder: "0",
    isCodeRequired: false,
    turnover: "0",
    withdrawalTurnover: "0",
    offerOn: "1",
    offerType: "1",
    description: "",
    bonusCode: "",
    bonusExpiredDay: "365",
    splitBonus: "1",
    maxUser: "1",
    offerBudget: "0",
    value: "0",
    minDeposit: "0",
    maxDeposit: "0",
    variations: [{ min: "0", max: "0", percentage: "0" }],
  };
}

function toFormState(offer: AgentOffer): OfferFormState {
  const rateRaw = Number(getAuthSession()?.currency?.rate ?? 1);
  const rate = Number.isFinite(rateRaw) && rateRaw > 0 ? rateRaw : 1;
  const withRate = (value: number) => value * rate;
  return {
    title: offer.title || "",
    startDate: toDateTimeLocal(offer.startDate),
    endDate: toDateTimeLocal(offer.endDate),
    displayOrder: String(offer.displayOrder ?? 0),
    isCodeRequired: offer.isCodeRequired,
    turnover: numberToUiString(withRate(offer.turnover ?? 0)),
    withdrawalTurnover: numberToUiString(withRate(offer.withdrawalTurnover ?? 0)),
    offerOn: String(offer.offerOn || 1),
    offerType: String(offer.offerType || 1),
    description: offer.description || "",
    bonusCode: offer.bonusCode || "",
    bonusExpiredDay: String(offer.bonusExpiredDay ?? 365),
    splitBonus: String(offer.splitBonus ?? 1),
    maxUser: String(offer.offerUserLimit ?? 1),
    offerBudget: numberToUiString(withRate(offer.offerBudget ?? 0)),
    value: numberToUiString(withRate(offer.value ?? 0)),
    minDeposit: numberToUiString(withRate(offer.minDeposit ?? 0)),
    maxDeposit: numberToUiString(withRate(offer.maxDeposit ?? 0)),
    variations:
      offer.depositVariations.length > 0
        ? offer.depositVariations.map((v) => ({
            min: numberToUiString(withRate(v.min ?? 0)),
            max: numberToUiString(withRate(v.max ?? 0)),
            percentage: String(v.percentage ?? "0"),
          }))
        : [{ min: "0", max: "0", percentage: "0" }],
  };
}

export default function BonusManageOffersPage() {
  const { page, pageSize, setPage, setPageSize, pageSizeOptions } = usePagination();
  const [rows, setRows] = useState<AgentOffer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<OfferFormState>(defaultFormState);
  const [minDateTime, setMinDateTime] = useState("");
  const [currencyRate, setCurrencyRate] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!dialogOpen) return;
    setMinDateTime(getNowDateTimeLocal());
  }, [dialogOpen]);

  useEffect(() => {
    const rateRaw = Number(getAuthSession()?.currency?.rate ?? 1);
    if (Number.isFinite(rateRaw) && rateRaw > 0) {
      setCurrencyRate(rateRaw);
      return;
    }
    setCurrencyRate(1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAgentOffers({ page, pageSize })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setTotal(res.total);
      })
      .catch((e) => {
        if (cancelled) return;
        setRows([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load offers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, reloadKey]);

  const dialogTitle = useMemo(
    () => (editingId ? "Edit Offer" : "Add Offer"),
    [editingId],
  );

  const updateForm = <K extends keyof OfferFormState>(
    key: K,
    value: OfferFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openAddDialog = () => {
    setEditingId(null);
    setForm(defaultFormState());
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (offer: AgentOffer) => {
    setEditingId(offer.id);
    setForm(toFormState(offer));
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setFormError(null);
  };

  const addVariationRow = () => {
    setForm((prev) => ({
      ...prev,
      variations: [...prev.variations, { min: "0", max: "0", percentage: "0" }],
    }));
  };

  const updateVariation = (index: number, patch: Partial<VariationFormRow>) => {
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.map((row, idx) =>
        idx === index ? { ...row, ...patch } : row,
      ),
    }));
  };

  const removeVariation = (index: number) => {
    setForm((prev) => {
      if (prev.variations.length <= 1) {
        return {
          ...prev,
          variations: [{ min: "0", max: "0", percentage: "0" }],
        };
      }
      return {
        ...prev,
        variations: prev.variations.filter((_, idx) => idx !== index),
      };
    });
  };

  const toNumber = (value: string): number => Number(value || 0);
  const toApiAmount = (value: string): number => toNumber(value) / currencyRate;
  const toApiAmountString = (value: string): string =>
    numberToUiString(toApiAmount(value));

  const buildAddPayload = (): UpsertAgentOfferPayload => {
    const startDate = form.startDate ? new Date(form.startDate).toISOString() : "";
    const endDate = form.endDate ? new Date(form.endDate).toISOString() : "";
    return {
      startDate,
      endDate,
      title: form.title.trim(),
      description: form.description.trim(),
      bonusCode: form.bonusCode.trim(),
      offerOn: form.offerOn,
      offerType: form.offerType,
      value: toApiAmount(form.value),
      turnover: toApiAmountString(form.turnover || "0"),
      withdrawalTurnover: toApiAmount(form.withdrawalTurnover),
      splitBonus: toNumber(form.splitBonus),
      bonusExpiredDay: toNumber(form.bonusExpiredDay),
      depositVariations: form.variations.map((row) => ({
        min: toApiAmount(row.min),
        max: toApiAmount(row.max),
        percentage: row.percentage || "0",
      })),
      displayOrder: form.displayOrder || "0",
      offerUserLimit: form.maxUser || "1",
      offerBudget: toApiAmount(form.offerBudget),
      minDeposit: toApiAmount(form.minDeposit),
      maxDeposit: toApiAmount(form.maxDeposit),
    };
  };

  const buildUpdatePayload = (): UpsertAgentOfferPayload => {
    const base = buildAddPayload();
    return {
      ...base,
      id: editingId ?? undefined,
      isCodeRequired: form.isCodeRequired,
      offerUsedBudget: 0,
      offerUserUsed: 0,
      turnover: toApiAmount(form.turnover),
    };
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setFormError("Start and End date/time are required.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateAgentOffer(buildUpdatePayload());
      } else {
        await addAgentOffer(buildAddPayload());
      }
      setDialogOpen(false);
      setReloadKey((prev) => prev + 1);
    } catch (e) {
      setFormError(
        e instanceof Error
          ? e.message
          : "Failed to save offer. Please verify API endpoint and payload.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id || deletingId) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteAgentOffer(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete offer.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Manage Offers"
        breadcrumbs={["Bonus", "Bonus"]}
        action={
          <Button variant="primary" size="sm" onClick={openAddDialog}>
            Add New
          </Button>
        }
      />

      {error ? (
        <p className="mb-3 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <p className="mb-3 text-sm text-foreground-secondary">{total || rows.length} Row found</p>
        <Table>
          <TableHeader>
            <TableHead>Name</TableHead>
            <TableHead>Offer On</TableHead>
            <TableHead>Offer Type</TableHead>
            <TableHead align="right">Value</TableHead>
            <TableHead align="center">Offer Used/Budget</TableHead>
            <TableHead align="center">User Count/Max</TableHead>
            <TableHead align="right">Order</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead align="center">Action</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={10} message="Loading offers..." />
            ) : rows.length === 0 ? (
              <TableEmpty colSpan={10} message="No offers found." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title || "-"}</TableCell>
                  <TableCell>{mapOfferOn(row.offerOn)}</TableCell>
                  <TableCell>{mapOfferType(row.offerType)}</TableCell>
                  <TableCell align="right">{row.value}</TableCell>
                  <TableCell align="center">
                    {row.offerUserUsed}/{row.offerUsedBudget}
                  </TableCell>
                  <TableCell align="center">
                    {row.offerUserUsed}/{row.splitBonus}
                  </TableCell>
                  <TableCell align="right">{row.displayOrder}</TableCell>
                  <TableCell>{formatOfferDate(row.startDate)}</TableCell>
                  <TableCell>{formatOfferDate(row.endDate)}</TableCell>
                  <TableCell align="center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Edit offer"
                        onClick={() => openEditDialog(row)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-surface text-success transition-colors hover:bg-surface-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete offer"
                        onClick={() => void handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-surface text-error transition-colors hover:bg-surface-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          page={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={pageSizeOptions}
        />
      </Card>

      <Dialog
        isOpen={dialogOpen}
        onClose={closeDialog}
        title={dialogTitle}
        maxWidthClassName="max-w-6xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {formError ? (
            <p className="text-sm text-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              id="offer-title"
              label="Title *"
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              autoFocus
            />
            <Input
              id="offer-start"
              label="Offer Start DateTime *"
              type="datetime-local"
              value={form.startDate}
              min={minDateTime || undefined}
              onChange={(e) => updateForm("startDate", e.target.value)}
            />
            <Input
              id="offer-end"
              label="Offer End DateTime *"
              type="datetime-local"
              value={form.endDate}
              min={(form.startDate || minDateTime) || undefined}
              onChange={(e) => updateForm("endDate", e.target.value)}
            />
            <Input
              id="offer-display-order"
              label="Display Order"
              value={form.displayOrder}
              onChange={(e) => updateForm("displayOrder", e.target.value)}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isCodeRequired}
              onChange={(e) => updateForm("isCodeRequired", e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Is Code Required?
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              id="offer-bonus-code"
              label="Bonus Code"
              value={form.bonusCode}
              onChange={(e) => updateForm("bonusCode", e.target.value)}
              placeholder="bonus-code"
            />
            <Input
              id="offer-bonus-expire-days"
              label="Bonus Expire in Days *"
              value={form.bonusExpiredDay}
              onChange={(e) => updateForm("bonusExpiredDay", e.target.value)}
            />
            <Input
              id="offer-split-bonus"
              label="Split Bonus *"
              value={form.splitBonus}
              onChange={(e) => updateForm("splitBonus", e.target.value)}
            />
            <Input
              id="offer-required-turnover"
              label="Required Turnover *"
              value={form.turnover}
              onChange={(e) => updateForm("turnover", e.target.value)}
            />
            <Input
              id="offer-withdrawal-turnover"
              label="Withdrawal Turnover *"
              value={form.withdrawalTurnover}
              onChange={(e) => updateForm("withdrawalTurnover", e.target.value)}
            />
            <Input
              id="offer-budget"
              label="Offer Budget"
              value={form.offerBudget}
              onChange={(e) => updateForm("offerBudget", e.target.value)}
            />
            <Select
              id="offer-on"
              label="Offer On"
              value={form.offerOn}
              onChange={(e) => updateForm("offerOn", e.target.value)}
              options={OFFER_ON_OPTIONS}
            />
            <Input
              id="offer-max-user"
              label="Max User"
              value={form.maxUser}
              onChange={(e) => updateForm("maxUser", e.target.value)}
              placeholder="Max Users"
            />
            <Input
              id="offer-min-deposit"
              label="Minimum Deposit"
              value={form.minDeposit}
              onChange={(e) => updateForm("minDeposit", e.target.value)}
              placeholder="Min deposit"
            />
            <Select
              id="offer-type"
              label="Offer Type"
              value={form.offerType}
              onChange={(e) => updateForm("offerType", e.target.value)}
              options={OFFER_TYPE_OPTIONS}
            />
            <Input
              id="offer-value"
              label={form.offerType === "2" ? "Percentage Value" : "Fixed Value"}
              value={form.value}
              onChange={(e) => updateForm("value", e.target.value)}
            />
            <Input
              id="offer-max-deposit"
              label="Maximum Deposit"
              value={form.maxDeposit}
              onChange={(e) => updateForm("maxDeposit", e.target.value)}
              placeholder="Max deposit"
            />
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Deposit Variation</h3>
            <Button variant="outline" size="sm" onClick={addVariationRow}>
              + Add
            </Button>
          </div>
          <div className="space-y-2 rounded-sm border border-border bg-surface p-3">
            {form.variations.map((row, index) => (
              <div
                key={`variation-${index}`}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <Input
                  id={`variation-${index}-min`}
                  label={`Min ${index + 1}`}
                  value={row.min}
                  onChange={(e) => updateVariation(index, { min: e.target.value })}
                />
                <Input
                  id={`variation-${index}-max`}
                  label={`Max ${index + 1}`}
                  value={row.max}
                  onChange={(e) => updateVariation(index, { max: e.target.value })}
                />
                <Input
                  id={`variation-${index}-percentage`}
                  label={`Percentage ${index + 1}`}
                  value={row.percentage}
                  onChange={(e) => updateVariation(index, { percentage: e.target.value })}
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    aria-label={`Delete variation ${index + 1}`}
                    onClick={() => removeVariation(index)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-surface text-error transition-colors hover:bg-surface-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground-secondary">
              Description
            </label>
            <textarea
              id="offer-description"
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              className="min-h-[120px] w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Description"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}

