"use client";

import { useState } from "react";
import { PageHeader, Input, Select, Button } from "@/components";
import { Trash2 } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type ConditionRow = {
  id: string;
  policyType: string;
  operator: string;
  value: string;
  extras: string;
};

// ─── Static options ─────────────────────────────────────────────────────────

const UPDATE_OPTIONS = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
  { value: "hybrid", label: "Hybrid" }
];

// const POLICY_OPTIONS = [
//   { value: "select policy", label: "Select Policy" },
// ];

const OPERATOR_OPTIONS = [
  { value: "", label: "Select Operator" },
  { value: "eq", label: "Equals" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
  { value: "gte", label: "≥ Greater or equal" },
  { value: "lte", label: "≤ Less or equal" },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Toggle — raw button, inline styles only ────────────────────────────────
// NOT using Switch component: its CSS `peer` modifier triggers full-subtree
// repaint inside any parent that has overflow/stacking-context CSS.

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        flexShrink: 0,
        width: 36,
        height: 20,
        borderRadius: 999,
        border: "none",
        padding: 0,
        cursor: "pointer",
        position: "relative",
        background: checked ? "#228BE6" : "#d4d4d8",
        transition: "background 0.2s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CreateUserGroupPage() {
  // Static form state — no API calls (UI-only as requested)
  const [groupName, setGroupName] = useState("");
  const [updateType, setUpdateType] = useState("automatic");
  const [statusActive, setStatusActive] = useState(true);
  const [shortDescription, setShortDescription] = useState("");
  const [playerVisible, setPlayerVisible] = useState(false);
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [draftPolicy, setDraftPolicy] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const addCondition = () => {
    if (!draftPolicy) {
      setFormError("Please select a Policy Type first.");
      return;
    }
    setFormError(null);
    setConditions((p) => [
      ...p,
      { id: uid(), policyType: draftPolicy, operator: "", value: "", extras: "" },
    ]);
    setDraftPolicy("");
  };

  const patchCondition = (id: string, patch: Partial<Omit<ConditionRow, "id">>) =>
    setConditions((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const removeCondition = (id: string) =>
    setConditions((p) => p.filter((c) => c.id !== id));

  // const policyLabel = (v: string) =>
  //   POLICY_OPTIONS.find((o) => o.value === v)?.label ?? v;

  return (
    <div className="min-w-0">
      {/* PageHeader is safe — renders a plain div, no overflow */}
      <PageHeader
        title="Create User Group"
        breadcrumbs={["User Groups", "Create"]}
      />

      {/*
        Form container — plain div, NO overflow-hidden, NO overflow-auto.
        Card component is excluded because it bakes in `overflow-hidden`
        which creates a stacking context that breaks child CSS transitions.
      */}
      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="p-5 sm:p-6">

          {/* ── Group Name ── Input is safe: renders input+label, no overflow */}
          <div className="mb-5">
            <Input
              id="group-name"
              label="Group Name"
              placeholder="New Users Group"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          {/* ── User Type (read-only) ── */}
          <div className="mb-5">
            <Input
              id="user-type"
              label="User Type"
              value="Player"
              readOnly
              className="cursor-default bg-surface-2"
            />
          </div>

          {/* ── Update Type ── Select is safe: renders select+label, no overflow */}
          <div className="mb-5">
            <Select
              id="update-type"
              label="Update Type"
              value={updateType}
              onChange={(e) => setUpdateType(e.target.value)}
              options={UPDATE_OPTIONS}
            />
            <p className="mt-1 text-xs text-muted">
              Choose how you want users to be added to the group
            </p>
          </div>

          {/*
            ── Status toggle ──
            Toggle uses inline styles — NO conditional Tailwind classes on the
            stateful element. The badge uses inline style (not className) for the
            same reason: conditional Tailwind classes force React to swap the
            className string, triggering a full repaint of the parent clip area.
          */}
          <div className="mb-5 flex items-center gap-3">
            <span className="text-sm font-medium text-foreground-secondary">Status</span>
            <Toggle id="status-toggle" checked={statusActive} onChange={setStatusActive} />
          </div>

          {/* ── Rules / Conditions ── */}
          <div className="mb-5">
            <p className="mb-3 text-sm font-semibold text-foreground">
              Rules / Conditions
            </p>

            {/*
              Raw <table> with table-layout:fixed — columns share width proportionally.
              NOT using Table/* components: they wrap in <div class="overflow-x-auto">
              which creates a nested scroll container visible as a second scrollbar.
            */}
            <table
              className="mb-3 w-full rounded-lg border border-border"
              style={{ tableLayout: "fixed", borderCollapse: "collapse" }}
            >
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {["POLICY TYPE", "OPERATOR", "VALUE", "EXTRAS", "UPDATE", "REMOVE"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-foreground-tertiary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {conditions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted" />
                  </tr>
                ) : (
                  conditions.map((c) => (
                    <tr key={c.id} className="bg-surface hover:bg-surface-muted">
                      <td className="px-3 py-2.5 text-center text-sm text-foreground">
                        {/* {policyLabel(c.policyType)} */}
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={c.operator}
                          onChange={(e) => patchCondition(c.id, { operator: e.target.value })}
                          className="w-full rounded-md border border-[#e8e8e8] bg-white px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          {OPERATOR_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={c.value}
                          placeholder="Value"
                          onChange={(e) => patchCondition(c.id, { value: e.target.value })}
                          className="w-full rounded-md border border-[#e8e8e8] bg-white px-2 py-1.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={c.extras}
                          placeholder="Extras"
                          onChange={(e) => patchCondition(c.id, { extras: e.target.value })}
                          className="w-full rounded-md border border-[#e8e8e8] bg-white px-2 py-1.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                        >
                          Save
                        </button>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          aria-label="Remove condition"
                          onClick={() => removeCondition(c.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-error hover:bg-error-subtle"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Add condition panel */}
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-3">
                <Select
                  id="draft-policy"
                  label="Policy Type"
                  value={draftPolicy}
                  onChange={(e) => setDraftPolicy(e.target.value)}
                  // options={POLICY_OPTIONS}
                  placeholder="Select Policy"
                />
              </div>
              {/* Button is safe — renders a plain <button>, no overflow */}
              <Button variant="primary" size="md" fullWidth onClick={addCondition}>
                Add Condition
              </Button>
            </div>
          </div>

          {/* ── Short Description ── */}
          <div className="mb-5">
            <Input
              id="short-description"
              label="Short Description"
              placeholder="description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
            />
          </div>

          {/* ── Player Visible toggle ── same inline-style Toggle, no Switch */}
          <div className="mb-6 flex items-center gap-3">
            <span className="whitespace-nowrap text-sm font-medium text-foreground-secondary">
              Player Visible
            </span>
            <Toggle id="player-visible-toggle" checked={playerVisible} onChange={setPlayerVisible} />
            <span className="text-xs text-muted">
              If checked, user group will be visible to the player
            </span>
          </div>

          {/* ── Error ── */}
          {formError && (
            <p className="mb-4 text-sm text-error" role="alert">{formError}</p>
          )}

          {/* ── Submit — Button is safe ── */}
          <div className="flex justify-center">
            <Button variant="primary" size="lg">
              Create
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
