"use client";

import { useState } from "react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
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

export default function LockStatusPage() {
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

  const nodes = (data?.nodes ?? data?.children ?? (Array.isArray(data) ? data : [])) as Record<string, unknown>[];
  const list = Array.isArray(nodes) ? nodes : [];

  return (
    <div className="min-w-0">
      <PageHeader
        title="Lock Status"
        breadcrumbs={["Markets", "Lock Status"]}
      />
      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input
              placeholder="Sport ID"
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              className="max-w-[200px]"
            />
            <Button variant="primary" onClick={handleLoad} disabled={loading}>
              {loading ? "Loading…" : "Load"}
            </Button>
          </FilterBar>
          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>Node</TableHead>
            <TableHead>Status</TableHead>
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
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
