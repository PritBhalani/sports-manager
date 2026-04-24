"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  FilterBar,
  Input,
  Button,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  Tabs,
} from "@/components";
import {
  getInOutActivity,
  getCasinoActivity,
  getParentStatus,
} from "@/services/account.service";
import { getSessionMemberId } from "@/services/user.service";
import { formatDateTime } from "@/utils/date";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { formatCurrency } from "@/utils/formatCurrency";

export default function AccountActivityPage() {
  const [userId, setUserId] = useState("");
  const [activeTab, setActiveTab] = useState<"inout" | "casino" | "parent">("inout");
  const [inOutData, setInOutData] = useState<Record<string, unknown>[]>([]);
  const [casinoData, setCasinoData] = useState<Record<string, unknown>[]>([]);
  const [parentStatus, setParentStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = getSessionMemberId();
    if (id) setUserId(id);
  }, []);

  const loadInOut = () => {
    if (!userId.trim()) return;
    setLoading(true);
    getInOutActivity(userId.trim())
      .then(setInOutData)
      .catch(() => setInOutData([]))
      .finally(() => setLoading(false));
  };

  const loadCasino = () => {
    if (!userId.trim()) return;
    setLoading(true);
    getCasinoActivity(userId.trim())
      .then(setCasinoData)
      .catch(() => setCasinoData([]))
      .finally(() => setLoading(false));
  };

  const loadParent = () => {
    if (!userId.trim()) return;
    setLoading(true);
    getParentStatus(userId.trim())
      .then(setParentStatus)
      .catch(() => setParentStatus(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (activeTab === "inout") loadInOut();
    else if (activeTab === "casino") loadCasino();
    else loadParent();
  }, [userId, activeTab]);

  const handleLoad = () => {
    if (activeTab === "inout") loadInOut();
    else if (activeTab === "casino") loadCasino();
    else loadParent();
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Account Activity"
        breadcrumbs={["Accounts", "Activity"]}
      />
      <FilterBar className="mb-4">
        <Input
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="max-w-[200px]"
        />
        <Button variant="primary" onClick={handleLoad} disabled={loading}>
          {loading ? "Loading…" : "Load"}
        </Button>
      </FilterBar>
      <Tabs
        activeId={activeTab}
        onTabChange={(id) => setActiveTab(id as "inout" | "casino" | "parent")}
        tabs={[
          {
            id: "inout",
            label: "In/Out Activity",
            content: (
              <Card>
                <Table>
                  <TableHeader>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead >Amount</TableHead>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableEmpty colSpan={3} message="Loading…" />
                    ) : inOutData.length === 0 ? (
                      <TableEmpty colSpan={3} message="No in/out activity." />
                    ) : (
                      inOutData.map((row, i) => {
                        const amt = Number(row.amount ?? row.chips ?? 0);
                        return (
                        <TableRow key={i}>
                          <TableCell>{formatDateTime(row.date ?? row.timestamp)}</TableCell>
                          <TableCell>{String(row.type ?? row.dwType ?? "")}</TableCell>
                          <TableCell  className={`tabular-nums ${signedAmountTextClass(amt)}`}>{formatCurrency(row.amount ?? row.chips)}</TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>
            ),
          },
          {
            id: "casino",
            label: "Casino Activity",
            content: (
              <Card>
                <Table>
                  <TableHeader>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead >Amount</TableHead>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableEmpty colSpan={3} message="Loading…" />
                    ) : casinoData.length === 0 ? (
                      <TableEmpty colSpan={3} message="No casino activity." />
                    ) : (
                      casinoData.map((row, i) => {
                        const amt = Number(row.amount ?? row.chips ?? 0);
                        return (
                        <TableRow key={i}>
                          <TableCell>{formatDateTime(row.date ?? row.timestamp)}</TableCell>
                          <TableCell>{String(row.description ?? "")}</TableCell>
                          <TableCell  className={`tabular-nums ${signedAmountTextClass(amt)}`}>{formatCurrency(row.amount ?? row.chips)}</TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>
            ),
          },
          {
            id: "parent",
            label: "Parent Status",
            content: (
              <Card>
                <div className="p-4">
                  {loading ? (
                    <p className="text-sm text-muted">Loading…</p>
                  ) : parentStatus === null ? (
                    <p className="text-sm text-muted">No parent status or enter User ID and Load.</p>
                  ) : (
                    <pre className="overflow-auto rounded bg-surface-muted p-4 text-sm">
                      {JSON.stringify(parentStatus, null, 2)}
                    </pre>
                  )}
                </div>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
