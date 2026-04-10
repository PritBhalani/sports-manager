"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Button,
  DialogActions,
  DialogSection,
  DIALOG_BODY_DEFAULT,
  Input,
  Modal,
  Select,
  type SelectOption,
} from "@/components";
import {
  changeOffPayOutRequestStatus,
  type OffPayInRecord,
} from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";

/** Values aligned with withdrawal workflow (see filter + table on withdraw request page). */
const MODAL_STATUS_OPTIONS: SelectOption[] = [
  { value: "1", label: "Pending" },
  { value: "2", label: "InProcess" },
  { value: "3", label: "Confirm" },
  { value: "4", label: "Rejected" },
];

function formatRequestedOn(value: unknown): string {
  if (value === undefined || value === null) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${mi}`;
}

export type WithdrawRequestUpdateModalProps = {
  open: boolean;
  onClose: () => void;
  row: OffPayInRecord | null;
  currentStatusLabel: string;
  onSaved: () => void;
};

export default function WithdrawRequestUpdateModal({
  open,
  onClose,
  row,
  currentStatusLabel,
  onSaved,
}: WithdrawRequestUpdateModalProps) {
  const [status, setStatus] = useState("1");
  const [comment, setComment] = useState("");
  const [payOutSlipDataUrl, setPayOutSlipDataUrl] = useState("");
  const [slipFileName, setSlipFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row) return;
    setStatus(String(row.status ?? "1"));
    setComment("");
    setPayOutSlipDataUrl("");
    setSlipFileName("");
    setFormError(null);
  }, [open, row]);

  const onSlipFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setPayOutSlipDataUrl("");
      setSlipFileName("");
      return;
    }
    setSlipFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") setPayOutSlipDataUrl(r);
    };
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    if (!row?.id) return;
    setFormError(null);
    setSaving(true);
    try {
      await changeOffPayOutRequestStatus({
        id: row.id,
        status,
        comment: comment.trim(),
        payOutSlip: payOutSlipDataUrl || "",
      });
      onSaved();
      onClose();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!row) return null;

  const username = row.user?.username ?? "—";

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Change Withdrawal Request Status"
      maxWidthClassName="max-w-3xl"
      bodyClassName={DIALOG_BODY_DEFAULT}
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
        <p className="text-sm text-foreground-secondary">
          FairX Withdrawal Request Of :{" "}
          <span className="font-semibold text-foreground">{username}</span>
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2/60 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
                Amount
              </span>
              <span className="text-lg font-semibold tabular-nums text-primary">{formatCurrency(row.amount)}</span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border/80 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
                Current Status
              </span>
              <span className="text-sm font-medium text-foreground">{currentStatusLabel}</span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border/80 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
                Requested On
              </span>
              <span className="text-sm tabular-nums text-foreground">{formatRequestedOn(row.createdOn)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2/60 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
                A/C No.
              </span>
              <span className="break-all text-right text-sm font-semibold tabular-nums text-error">
                {row.acNo ?? "—"}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border/80 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
                Bank
              </span>
              <span className="text-right text-sm text-foreground">{row.bankName ?? "—"}</span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border/80 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
                IFSC
              </span>
              <span className="text-right text-sm tabular-nums text-foreground">{row.ifscCode ?? "—"}</span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-border/80 pt-3">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground-tertiary">
                A/C Name
              </span>
              <span className="text-right text-sm text-foreground">{row.acName ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div />
          <div className="space-y-4 rounded-lg border border-border bg-surface px-4 py-4 sm:px-5">
            <Select
              label="Status"
              options={MODAL_STATUS_OPTIONS}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
            <Input
              label="Comment"
              type="text"
              placeholder="Comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-foreground-secondary">Payout slip</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  key={`${row.id}-${open ? "o" : "c"}`}
                  type="file"
                  accept="image/*"
                  className="max-w-full cursor-pointer text-sm file:mr-2 file:rounded-sm file:border file:border-border file:bg-surface-muted file:px-2 file:py-1 file:text-sm"
                  onChange={onSlipFileChange}
                />
                <span className="text-xs text-muted">
                  {slipFileName || "No file chosen"}
                </span>
              </div>
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
