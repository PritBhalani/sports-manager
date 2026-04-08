"use client";

import { useEffect, useState } from "react";
import {
  Button,
  DialogFormRow,
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
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";

const MODAL_STATUS_OPTIONS: SelectOption[] = [
  { value: "1", label: "Init" },
  { value: "2", label: "Confirm" },
  { value: "3", label: "Cancel" },
  { value: "4", label: "Expired" },
];

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
    setStatus(String(row.status ?? "1"));
    setAmount(String(row.amount ?? ""));
    setBonusAmount(String(row.bonusAmount ?? 0));
    setComment("");
    setRemoveOffer(false);
    setFormError(null);
  }, [open, row]);

  const handleSave = async () => {
    if (!row?.id) return;
    const amt = parseFloat(String(amount).replace(/,/g, ""));
    const bonus = parseFloat(String(bonusAmount).replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt < 0) {
      setFormError("Enter a valid amount.");
      return;
    }
    if (!Number.isFinite(bonus) || bonus < 0) {
      setFormError("Enter a valid bonus amount.");
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await changeOffPayInRequestStatus({
        id: row.id,
        status,
        removeOffer,
        amount: amt,
        bonusAmount: bonus,
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

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Change deposit request status"
      maxWidthClassName="max-w-3xl"
      bodyClassName="space-y-4"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <DialogSection>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-foreground-secondary">Deposit request of:</span>{" "}
              <span className="font-medium">{row.user?.username ?? "—"}</span>
            </div>
            <div>
              <span className="text-foreground-secondary">Amount:</span>{" "}
              <span className="tabular-nums">{formatCurrency(row.amount)}</span>
            </div>
            <div>
              <span className="text-foreground-secondary">Bonus amount:</span>{" "}
              <span className="tabular-nums">{formatCurrency(row.bonusAmount ?? 0)}</span>
            </div>
            <div>
              <span className="text-foreground-secondary">Current status:</span>{" "}
              <span>{currentStatusLabel}</span>
            </div>
            <div>
              <span className="text-foreground-secondary">UTR no.:</span>{" "}
              <span className="tabular-nums">{row.utrNo ?? "—"}</span>
            </div>
            <div>
              <span className="text-foreground-secondary">A/C no.:</span>{" "}
              <span>{row.acNo ?? "—"}</span>
            </div>
            {acHolder ? (
              <div>
                <span className="text-foreground-secondary">A/C holder:</span>{" "}
                <span>{acHolder}</span>
              </div>
            ) : null}
            <div>
              <span className="text-foreground-secondary">Date:</span> <span>{when}</span>
            </div>
          </div>

          <div className="space-y-3">
            <DialogFormRow>
              <Select
                label="Status"
                options={MODAL_STATUS_OPTIONS}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </DialogFormRow>
            <DialogFormRow>
              <Input
                label="Amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </DialogFormRow>
            <DialogFormRow>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border-strong"
                  checked={removeOffer}
                  onChange={(e) => setRemoveOffer(e.target.checked)}
                />
                Remove offer?
              </label>
            </DialogFormRow>
            <DialogFormRow>
              <Input
                label="Bonus"
                type="text"
                inputMode="decimal"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
              />
            </DialogFormRow>
            <DialogFormRow>
              <Input
                label="Comment"
                type="text"
                placeholder="Comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </DialogFormRow>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => presetComment("Payment Received")}
              >
                Payment received
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => presetComment("Payment Not Received")}
              >
                Payment not received
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => presetComment("Used Slip")}
              >
                Used slip
              </Button>
            </div>
            {formError ? (
              <p className="text-sm text-error" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
        </div>
      </DialogSection>
    </Modal>
  );
}
