"use client";

import { useState } from "react";
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
  Badge,
} from "@/components";
import { getMarketLockStatus } from "@/services/market.service";

export default function MarketsManagePage() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [sportId, setSportId] = useState("");

  const handleLoad = () => {
    if (!sportId.trim()) return;
    setLoading(true);
    getMarketLockStatus(sportId.trim())
      .then((res) => setData(res ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  const nodes = (data?.nodes ?? data?.children ?? Array.isArray(data) ? data : []) as Record<string, unknown>[];
  const list = Array.isArray(nodes) ? nodes : [];

  return (
    <div className="min-w-0">
      <PageHeader
        title="Manage Market"
        breadcrumbs={["Markets", "Manage"]}
      />
      <FilterBar className="mb-4">
        <Input
          placeholder="Sport ID"
          value={sportId}
          onChange={(e) => setSportId(e.target.value)}
          className="max-w-[200px]"
        />
        <Button variant="primary" onClick={handleLoad} disabled={loading}>
          {loading ? "Loading…" : "Load status"}
        </Button>
      </FilterBar>
      <Card>
        <Table>
          <TableHeader>
            <TableHead>Node / Market</TableHead>
            <TableHead>Lock status</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={2} message="Loading…" />
            ) : list.length === 0 ? (
              <TableEmpty colSpan={2} message="Enter Sport ID and click Load." />
            ) : (
              list.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{String(row.name ?? row.nodeId ?? row.id ?? "—")}</TableCell>
                  <TableCell>
                    {row.isLock != null ? (
                      <Badge variant={row.isLock ? "error" : "success"}>
                        {row.isLock ? "Locked" : "Open"}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
