"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Button,
  DialogActions,
  DialogSection,
  DIALOG_BODY_DEFAULT,
  Input,
  Modal,
} from "@/components";
import { useDebounce } from "@/hooks/useDebounce";
import {
  addMember,
  checkUsername,
  getNextUserCode,
  getSessionMemberId,
} from "@/services/user.service";

export type CreateMemberModalProps = {
  open: boolean;
  onClose: () => void;
  /** Called after successful create (refresh list, etc.). */
  onCreated?: () => void;
};

export default function CreateMemberModal({
  open,
  onClose,
  onCreated,
}: CreateMemberModalProps) {
  const [codeLoading, setCodeLoading] = useState(false);
  const [codePrefix, setCodePrefix] = useState("");
  const [fl, setFl] = useState("0");
  const [sl, setSl] = useState("0");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [creditRef, setCreditRef] = useState("0");
  const [pt, setPt] = useState("");
  const [notes, setNotes] = useState("");
  const [activeStatus, setActiveStatus] = useState(true);
  const [usernameCheck, setUsernameCheck] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmedUsername = username.trim();
  const debouncedUsername = useDebounce(trimmedUsername, 400);
  const usernameTyping =
    Boolean(trimmedUsername) && trimmedUsername !== debouncedUsername;

  const assembledUserCode = `${codePrefix}${fl}${sl}`;

  const resetForm = useCallback(() => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setMobile("");
    setCreditRef("0");
    setPt("");
    setNotes("");
    setActiveStatus(true);
    setUsernameCheck("idle");
    setFormError(null);
    setFl("0");
    setSl("0");
    setCodePrefix("");
  }, []);

  useEffect(() => {
    if (!open) return;
    resetForm();
    const parentId = getSessionMemberId();
    if (!parentId) {
      setFormError("Not logged in. Cannot load user code.");
      return;
    }
    setCodeLoading(true);
    getNextUserCode(parentId)
      .then((code) => {
        const full = code.trim();
        if (full.length >= 2) {
          setCodePrefix(full.slice(0, -2));
          setFl(full.slice(-2, -1) || "0");
          setSl(full.slice(-1) || "0");
        } else if (full) {
          setCodePrefix(full);
          setFl("0");
          setSl("0");
        }
      })
      .catch(() => {
        setFormError("Could not load next user code.");
      })
      .finally(() => setCodeLoading(false));
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    if (!debouncedUsername) {
      setUsernameCheck("idle");
      return;
    }
    let cancelled = false;
    setUsernameCheck("checking");
    checkUsername(debouncedUsername)
      .then(({ available }) => {
        if (!cancelled) setUsernameCheck(available ? "available" : "taken");
      })
      .catch(() => {
        if (!cancelled) setUsernameCheck("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedUsername]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parentId = getSessionMemberId();
    if (!parentId) {
      setFormError("Not logged in.");
      return;
    }
    if (!trimmedUsername) {
      setFormError("Username is required.");
      return;
    }
    if (usernameTyping || usernameCheck === "checking") {
      setFormError("Wait for username check to finish.");
      return;
    }
    if (usernameCheck !== "available") {
      setFormError("Choose an available username.");
      return;
    }
    if (!password.trim()) {
      setFormError("Password is required.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Password and repeat password must match.");
      return;
    }
    const credit = Number(creditRef);
    if (!Number.isFinite(credit) || credit < 0 || credit > 28_000) {
      setFormError("Credit limit must be between 0 and 28,000.");
      return;
    }

    setSaving(true);
    try {
      await addMember(
        {
          status: activeStatus ? 2 : -1,
          ptConfig: {},
          fl: fl.trim() || "0",
          sl: sl.trim() || "0",
          isInvalid: false,
          isNameInvalid: false,
          username: trimmedUsername,
          password,
          confirmpassword: confirmPassword,
          mobile: mobile.trim(),
          creditRef: credit,
          pt: pt.trim() || "0",
          notes: notes.trim(),
          userCode: assembledUserCode,
          parentId,
        },
        { showSuccessToast: true },
      );
      onCreated?.();
      onClose();
    } catch {
      /* global mutation toast on error */
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const showUsernameChecking =
    usernameTyping || usernameCheck === "checking";

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Create member"
      maxWidthClassName="max-w-5xl"
      bodyClassName={DIALOG_BODY_DEFAULT}
      footer={
        <DialogActions>
          <Button
            type="submit"
            form="create-member-form"
            variant="primary"
            size="md"
            disabled={saving || codeLoading}
          >
            {saving ? "Creating…" : "Create"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
        </DialogActions>
      }
    >
      <DialogSection>
        <form id="create-member-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {formError ? (
            <p className="text-sm text-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Information</h3>

              <div className="space-y-1">
                <span className="text-sm font-medium text-foreground">Usercode</span>
                {codeLoading ? (
                  <p className="text-xs text-muted">Loading code…</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm text-foreground-secondary">
                      {codePrefix || "—"}
                    </span>
                    <Input
                      value={fl}
                      onChange={(e) => setFl(e.target.value)}
                      className="!w-14"
                      aria-label="User code first suffix"
                      maxLength={4}
                    />
                    <span className="text-muted">-</span>
                    <Input
                      value={sl}
                      onChange={(e) => setSl(e.target.value)}
                      className="!w-14"
                      aria-label="User code second suffix"
                      maxLength={4}
                    />
                  </div>
                )}
                <p className="text-xs text-muted">
                  Full code:{" "}
                  <span className="font-mono text-foreground">{assembledUserCode || "—"}</span>
                </p>
              </div>

              <Input
                label="User name"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
              />
              {showUsernameChecking && (
                <p className="text-xs text-muted">Checking username…</p>
              )}
              {!showUsernameChecking && usernameCheck === "available" && (
                <p className="text-xs text-success">Username available.</p>
              )}
              {!showUsernameChecking && usernameCheck === "taken" && (
                <p className="text-xs text-error">Username already taken.</p>
              )}

              <Input
                type="password"
                label="Password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Input
                type="password"
                label="Repeat password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Input
                label="Mobile number"
                placeholder="+919898989898"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground-secondary">Status</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="member-status"
                      checked={activeStatus}
                      onChange={() => setActiveStatus(true)}
                      className="h-4 w-4 border-border"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="radio"
                      name="member-status"
                      checked={!activeStatus}
                      onChange={() => setActiveStatus(false)}
                      className="h-4 w-4 border-border"
                    />
                    Inactive
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Credit &amp; PT</h3>
              <Input
                label="Credit limit"
                type="number"
                min={0}
                max={28000}
                step="any"
                value={creditRef}
                onChange={(e) => setCreditRef(e.target.value)}
              />
              <p className="text-xs text-muted">0 – 28,000</p>
              <Input
                label="PT"
                placeholder="0"
                value={pt}
                onChange={(e) => setPt(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Notes</h3>
              <div className="min-w-0">
                <label
                  className="mb-1 block text-sm font-medium text-foreground-secondary"
                  htmlFor="create-member-notes"
                >
                  Notes
                </label>
                <textarea
                  id="create-member-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  placeholder="Optional notes"
                  className="box-border w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </form>
      </DialogSection>
    </Modal>
  );
}
