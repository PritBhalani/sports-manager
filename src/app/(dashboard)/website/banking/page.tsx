"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  Modal,
  DialogActions,
  DialogSection,
  DIALOG_BODY_DEFAULT,
  DIALOG_BODY_COMPACT,
} from "@/components";
import { Pencil, Plus, Loader2, Trash2 } from "lucide-react";
import {
  getBankDetails,
  changeActiveBank,
  addBankDetails,
  updateBankDetails,
  deleteBankDetails,
  type BankDetailRecord,
  type AddBankDetailsBody,
} from "@/services/account.service";
import { useToast } from "@/context/ToastContext";

type BankingRow = {
  id: string;
  raw: BankDetailRecord;
  accountNo: string;
  bank: string;
  accountHolder: string;
  ifsc: string;
  type: string;
  whatsapp: string;
  telegram: string;
  status: "active" | "inactive";
};

type BankFormDraft = {
  id?: string;
  detailType: string;
  /** Only used when editing (update API requires isActive). */
  isActive: boolean;
  acNo: string;
  acHolder: string;
  bankName: string;
  ifsc: string;
  whatsapp: string;
  telegram: string;
};

const DETAIL_TYPE_OPTIONS = [
  { value: "1", label: "Bank" },
  { value: "2", label: "UPI" },
  { value: "3", label: "GPay" },
  { value: "4", label: "Paytm" },
  { value: "5", label: "PhonePay" },
  { value: "6", label: "MobiKwik" },
  { value: "7", label: "AmazonPay" },
] as const;

const emptyDraft = (): BankFormDraft => ({
  detailType: "2",
  isActive: true,
  acNo: "",
  acHolder: "",
  bankName: "",
  ifsc: "",
  whatsapp: "",
  telegram: "",
});

function isBankDetailType(detailType: string): boolean {
  return String(detailType) === "1";
}

function detailTypeLabel(detailType: unknown): string {
  const s = String(detailType ?? "").trim();
  const found = DETAIL_TYPE_OPTIONS.find((o) => o.value === s);
  if (found) return found.label;
  if (s) return `Type ${s}`;
  return "—";
}

function recordToDraft(r: BankDetailRecord): BankFormDraft {
  const dt = String(r.detailType ?? "2");
  const wa =
    String(r.whatsAppNo ?? r.whatsapp ?? "").trim();
  const tg =
    String(r.telegramNo ?? r.telegram ?? "").trim();
  return {
    id: r.id ? String(r.id) : undefined,
    detailType: DETAIL_TYPE_OPTIONS.some((o) => o.value === dt) ? dt : "2",
    isActive: r.isActive !== false,
    acNo: String(r.acNo ?? ""),
    acHolder: String(r.acHolder ?? ""),
    bankName: String(r.bankName ?? ""),
    ifsc: String(r.ifsc ?? ""),
    whatsapp: wa,
    telegram: tg,
  };
}

function mapBankRecord(r: BankDetailRecord): BankingRow {
  const active = r.isActive !== false;
  const wa = String(r.whatsAppNo ?? r.whatsapp ?? "").trim();
  const tg = String(r.telegramNo ?? r.telegram ?? "").trim();
  return {
    id: String(r.id ?? ""),
    raw: r,
    accountNo: String(r.acNo ?? "—"),
    bank: String(r.bankName ?? "—"),
    accountHolder: String(r.acHolder ?? "—"),
    ifsc: String(r.ifsc ?? "—"),
    type: detailTypeLabel(r.detailType),
    whatsapp: wa || "—",
    telegram: tg || "—",
    status: active ? "active" : "inactive",
  };
}

function StatusYesNo({
  active,
  busy,
  onSetActive,
}: {
  active: boolean;
  busy: boolean;
  onSetActive: (next: boolean) => void;
}) {
  return (
    <span
      className="inline-flex overflow-hidden rounded border border-[#4b5301]/80 shadow-sm"
      role="group"
      aria-label={active ? "Status: active" : "Status: inactive"}
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => onSetActive(true)}
        className={`min-w-[2.75rem] px-2.5 py-1 text-center text-xs font-semibold transition-colors enabled:cursor-pointer disabled:opacity-50 ${
          active ? "bg-[#4b5301] text-white" : "bg-zinc-950 text-zinc-500 hover:bg-zinc-900"
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onSetActive(false)}
        className={`min-w-[2.75rem] px-2.5 py-1 text-center text-xs font-semibold transition-colors enabled:cursor-pointer disabled:opacity-50 ${
          !active ? "bg-[#4b5301] text-white" : "bg-zinc-950 text-zinc-500 hover:bg-zinc-900"
        }`}
      >
        No
      </button>
    </span>
  );
}

export default function WebsiteBankingPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [rawRows, setRawRows] = useState<BankDetailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [bankFormDraft, setBankFormDraft] = useState<BankFormDraft>(() => emptyDraft());
  const [bankFormSaving, setBankFormSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    getBankDetails()
      .then((list) => {
        setRawRows(Array.isArray(list) ? list : []);
      })
      .catch((e) => {
        setRawRows([]);
        setLoadError(e instanceof Error ? e.message : "Failed to load bank details.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSetActive = useCallback(
    async (bankId: string, next: boolean, current: boolean) => {
      if (!bankId.trim() || next === current) return;
      setTogglingId(bankId);
      try {
        await changeActiveBank(bankId, next);
        showToast({ type: "success", message: "Updated successfully." });
        await load();
      } catch (e) {
        showToast({
          type: "error",
          message: e instanceof Error ? e.message : "Could not update status.",
        });
      } finally {
        setTogglingId(null);
      }
    },
    [load, showToast],
  );

  const openAdd = () => {
    setBankFormDraft({ ...emptyDraft(), isActive: true });
    setBankFormOpen(true);
  };

  const openEdit = (row: BankingRow) => {
    setBankFormDraft(recordToDraft(row.raw));
    setBankFormOpen(true);
  };

  const closeBankForm = () => {
    if (bankFormSaving) return;
    setBankFormOpen(false);
  };

  const submitBankForm = async () => {
    const d = bankFormDraft;
    if (!d.acNo.trim()) {
      showToast({
        type: "error",
        message: isBankDetailType(d.detailType)
          ? "Enter account number."
          : "Enter UPI / ID.",
      });
      return;
    }
    setBankFormSaving(true);
    try {
      const acNo = d.acNo.trim();
      const acHolder = d.acHolder.trim();
      const whatsAppNo = d.whatsapp.trim() || undefined;
      const telegramNo = d.telegram.trim() || undefined;

      if (d.id) {
        await updateBankDetails({
          id: d.id,
          detailType: d.detailType,
          acNo,
          acHolder: acHolder || undefined,
          ifsc: isBankDetailType(d.detailType) ? d.ifsc.trim() || undefined : undefined,
          bankName: isBankDetailType(d.detailType) ? d.bankName.trim() || undefined : undefined,
          whatsAppNo,
          telegramNo,
          isActive: d.isActive,
        });
      } else {
        const addBody: AddBankDetailsBody = {
          detailType: d.detailType,
          acNo,
          acHolder: acHolder || undefined,
          whatsAppNo,
          telegramNo,
        };
        if (isBankDetailType(d.detailType)) {
          addBody.ifsc = d.ifsc.trim() || undefined;
          addBody.bankName = d.bankName.trim() || undefined;
        }
        await addBankDetails(addBody);
      }
      setBankFormOpen(false);
      setBankFormDraft(emptyDraft());
      await load();
    } catch {
      /* apiClient surfaces mutation toast on failure */
    } finally {
      setBankFormSaving(false);
    }
  };

  const confirmDeleteProceed = async () => {
    if (!confirmDelete?.id) return;
    setDeleteSubmitting(true);
    try {
      await deleteBankDetails(confirmDelete.id);
      showToast({ type: "success", message: "Deleted successfully." });
      setConfirmDelete(null);
      await load();
    } catch (e) {
      showToast({
        type: "error",
        message: e instanceof Error ? e.message : "Could not delete bank detail.",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const mappedRows = useMemo(() => rawRows.map(mapBankRecord), [rawRows]);

  const rows = useMemo(() => {
    return mappedRows.filter((row) => {
      const statusOk = status === "all" || row.status === status;
      const q = search.trim().toLowerCase();
      if (!q) return statusOk;
      const text =
        `${row.accountNo} ${row.bank} ${row.accountHolder} ${row.ifsc} ${row.type} ${row.whatsapp} ${row.telegram}`.toLowerCase();
      return statusOk && text.includes(q);
    });
  }, [mappedRows, search, status]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Website Banking"
        breadcrumbs={["Website", "Banking"]}
        action={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" aria-hidden />}
            onClick={openAdd}
          >
            Add Account
          </Button>
        }
      />

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4 sm:px-6">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search account, bank, holder, IFSC"
            className="h-9 w-full sm:w-[300px]"
          />
          <Select
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { label: "All Status", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
            className="h-9 w-[180px]"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => void load()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
                Refreshing…
              </>
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        {loadError ? (
          <div className="border-b border-border px-5 py-3 text-sm text-error sm:px-6" role="alert">
            {loadError}
          </div>
        ) : null}

        <Table>
          <TableHeader className="bg-surface">
            <TableHead className="text-xs font-bold uppercase tracking-wide text-foreground-secondary">
              A/C Number
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wide text-foreground-secondary">
              Bank
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wide text-foreground-secondary">
              A/C Holder
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wide text-foreground-secondary">
              IFSC
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wide text-foreground-secondary">
              Type
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wide text-foreground-secondary">
              Whatsapp
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wide text-foreground-secondary">
              Telegram
            </TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wide text-foreground-secondary">
              Status
            </TableHead>
            <TableHead
              align="center"
              className="text-xs font-bold uppercase tracking-wide text-foreground-secondary"
            >
              Action
            </TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={9} message="Loading bank details…" />
            ) : rows.length === 0 ? (
              <TableEmpty colSpan={9} message="No banking accounts found." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id || row.accountNo}>
                  <TableCell className="font-medium text-foreground">{row.accountNo}</TableCell>
                  <TableCell>{row.bank}</TableCell>
                  <TableCell>{row.accountHolder}</TableCell>
                  <TableCell className="font-mono text-xs">{row.ifsc}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.whatsapp}</TableCell>
                  <TableCell>{row.telegram}</TableCell>
                  <TableCell>
                    <StatusYesNo
                      active={row.status === "active"}
                      busy={togglingId === row.id}
                      onSetActive={(next) => void handleSetActive(row.id, next, row.status === "active")}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <div className="inline-flex items-center justify-center gap-1">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-cyan-500 transition-colors hover:bg-cyan-500/15 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        aria-label="Edit account"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-rose-400 transition-colors hover:bg-rose-500/15 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                        aria-label="Delete account"
                        onClick={() =>
                          setConfirmDelete({
                            id: row.id,
                            label: row.accountNo !== "—" ? row.accountNo : row.id,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal
        isOpen={bankFormOpen}
        onClose={closeBankForm}
        title="Add/Edit Bank"
        maxWidthClassName="max-w-lg"
        bodyClassName={DIALOG_BODY_DEFAULT}
        footer={
          <DialogActions>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={bankFormSaving}
              onClick={() => void submitBankForm()}
            >
              {bankFormSaving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={bankFormSaving}
              onClick={closeBankForm}
            >
              Cancel
            </Button>
          </DialogActions>
        }
      >
        <DialogSection>
          <div className="space-y-4">
            <Select
              label="Detail Type"
              value={bankFormDraft.detailType}
              onChange={(e) =>
                setBankFormDraft((d) => ({
                  ...d,
                  detailType: e.target.value,
                }))
              }
              options={[...DETAIL_TYPE_OPTIONS]}
              className="h-10"
            />
            {isBankDetailType(bankFormDraft.detailType) ? (
              <>
                <Input
                  label="Account Number"
                  value={bankFormDraft.acNo}
                  onChange={(e) => setBankFormDraft((d) => ({ ...d, acNo: e.target.value }))}
                  placeholder="Account number"
                />
                <Input
                  label="IFSC"
                  value={bankFormDraft.ifsc}
                  onChange={(e) => setBankFormDraft((d) => ({ ...d, ifsc: e.target.value }))}
                  placeholder="IFSC"
                  className="font-mono"
                />
                <Input
                  label="Bank Name"
                  value={bankFormDraft.bankName}
                  onChange={(e) => setBankFormDraft((d) => ({ ...d, bankName: e.target.value }))}
                  placeholder="Bank name"
                />
              </>
            ) : (
              <Input
                label={bankFormDraft.detailType === "2" ? "UPI" : "Account / ID"}
                value={bankFormDraft.acNo}
                onChange={(e) => setBankFormDraft((d) => ({ ...d, acNo: e.target.value }))}
                placeholder="UPI ID or payment ID"
              />
            )}
            <Input
              label="Account Holder"
              value={bankFormDraft.acHolder}
              onChange={(e) => setBankFormDraft((d) => ({ ...d, acHolder: e.target.value }))}
              placeholder="Account Holder"
            />
            <Input
              label="Whatsapp Number"
              value={bankFormDraft.whatsapp}
              onChange={(e) => setBankFormDraft((d) => ({ ...d, whatsapp: e.target.value }))}
              placeholder="Whatsapp Number"
            />
            <Input
              label="Telegram Number"
              value={bankFormDraft.telegram}
              onChange={(e) => setBankFormDraft((d) => ({ ...d, telegram: e.target.value }))}
              placeholder="Telegram Number"
            />
          </div>
        </DialogSection>
      </Modal>

      <Modal
        isOpen={Boolean(confirmDelete)}
        onClose={() => {
          if (!deleteSubmitting) setConfirmDelete(null);
        }}
        title="Confirm"
        maxWidthClassName="max-w-md"
        bodyClassName={DIALOG_BODY_COMPACT}
        footer={
          <DialogActions>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={deleteSubmitting}
              onClick={() => void confirmDeleteProceed()}
            >
              {deleteSubmitting ? "…" : "Proceed"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              disabled={deleteSubmitting}
              onClick={() => setConfirmDelete(null)}
            >
              Reject
            </Button>
          </DialogActions>
        }
      >
        <DialogSection>
          <p className="text-sm text-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{confirmDelete?.label ?? ""}</span>?
          </p>
        </DialogSection>
      </Modal>
    </div>
  );
}
