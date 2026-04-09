"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Button,
  DialogActions,
  DialogSection,
  Input,
  Modal,
  Select,
  type SelectOption,
} from "@/components";
import {
  changeOffPayInRequestStatus,
  type OffPayInRecord,
} from "@/services/account.service";
import { getAuthSession } from "@/store/authStore";
import { formatAmountNoRate, formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";

const MODAL_STATUS_OPTIONS: SelectOption[] = [
  { value: "1", label: "Init" },
  { value: "2", label: "Confirm" },
  { value: "3", label: "Cancel" },
  { value: "4", label: "Expired" },
];

function getDisplayCurrencyRate(): number {
  const r = Number(getAuthSession()?.currency?.rate ?? 1);
  return Number.isFinite(r) && r > 0 ? r : 1;
}

function toDisplayAmount(raw: number | undefined, rate: number): string {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n)) return formatAmountNoRate(0);
  return formatAmountNoRate(n * rate);
}

export type DepositRequestUpdateModalProps = {
  open: boolean;
  onClose: () => void;
  row: OffPayInRecord | null;
  /** Resolved label for pay-in row (Init / Confirm / …). */
  currentStatusLabel: string;
  onSaved: () => void;
};

export default function DepositRequestUpdateModal({
  open,
  onClose,
  row,
  currentStatusLabel,
  onSaved,
}: DepositRequestUpdateModalProps) {
  const [status, setStatus] = useState("1");
  const [amount, setAmount] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [comment, setComment] = useState("");
  const [removeOffer, setRemoveOffer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const acHolder =
    row && typeof row === "object" && "acHolder" in row
      ? String((row as { acHolder?: unknown }).acHolder ?? "")
      : row && typeof row === "object" && "acHolderName" in row
        ? String((row as { acHolderName?: unknown }).acHolderName ?? "")
        : "";

  useEffect(() => {
    if (!open || !row) return;
    const r = getDisplayCurrencyRate();
    setStatus(String(row.status ?? "1"));
    setAmount(toDisplayAmount(row.amount, r));
    setBonusAmount(toDisplayAmount(row.bonusAmount, r));
    setComment("");
    setRemoveOffer(false);
    setFormError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.id) return;
    const amtDisplay = parseFloat(String(amount).replace(/,/g, ""));
    const bonusDisplay = parseFloat(String(bonusAmount).replace(/,/g, ""));
    if (!Number.isFinite(amtDisplay) || amtDisplay < 0) {
      setFormError("Enter a valid amount.");
      return;
    }
    if (!Number.isFinite(bonusDisplay) || bonusDisplay < 0) {
      setFormError("Enter a valid bonus amount.");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      const r = getDisplayCurrencyRate();
      await changeOffPayInRequestStatus({
        id: row.id,
        status,
        removeOffer,
        amount: amtDisplay / r,
        bonusAmount: bonusDisplay / r,
        comment: comment.trim(),
      });
      onSaved();
      onClose();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const presetComment = (text: string) => {
    setComment(text);
  };

  if (!row) return null;

  const when = row.createdOn ? formatDateTime(row.createdOn) : "—";

  const detailRow = (label: string, value: ReactNode) => (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border/80 py-2.5 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm font-semibold text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Change deposit request status"
      maxWidthClassName="max-w-3xl"
      bodyClassName="space-y-5 p-4 sm:p-5"
      footer={
        <DialogActions>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
        </DialogActions>
      }
    >
      <DialogSection>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {/* Summary — matches list/card panels */}
          <div className="flex flex-col rounded-lg border border-border bg-surface-2/60 shadow-sm">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
                Request details
              </h3>
            </div>
            <div className="px-4 pb-4 pt-1 sm:px-5">
              {detailRow("Deposit request of", row.user?.username ?? "—")}
              {detailRow("Amount", formatCurrency(row.amount))}
              {detailRow("Bonus amount", formatCurrency(row.bonusAmount ?? 0))}
              {detailRow("Current status", currentStatusLabel)}
              {detailRow("UTR no.", row.utrNo ?? "—")}
              {detailRow("A/C no.", row.acNo ?? "—")}
              {acHolder ? detailRow("A/C holder", acHolder) : null}
              {detailRow("Date", when)}
            </div>
          </div>

          {/* Form — single column, no DialogFormRow 2-col grid */}
          <div className="flex flex-col rounded-lg border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-3 sm:px-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
                Update
              </h3>
              <p className="mt-1 text-xs text-foreground-tertiary">
                Amount and bonus use your session display scale (same as the table). Values are
                converted back for the API on save.
              </p>
            </div>
            <div className="space-y-4 px-4 pb-4 pt-4 sm:px-5">
              <Select
                label="Status"
                options={MODAL_STATUS_OPTIONS}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
              <Input
                label="Amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-surface-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border-strong text-primary focus:ring-primary/30"
                  checked={removeOffer}
                  onChange={(e) => setRemoveOffer(e.target.checked)}
                />
                Remove offer?
              </label>
              <Input
                label="Bonus"
                type="text"
                inputMode="decimal"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
              />
              <Input
                label="Comment"
                type="text"
                placeholder="Comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
                  Quick comment
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => presetComment("Payment Received")}
                  >
                    Payment received
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => presetComment("Payment Not Received")}
                  >
                    Payment not received
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => presetComment("Used Slip")}
                  >
                    Used slip
                  </Button>
                </div>
              </div>

              {formError ? (
                <p className="text-sm text-error" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </DialogSection>
    </Modal>
  );
}
