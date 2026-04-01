"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Input,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components";
import { getLoginHistory } from "@/services/token.service";
import { formatDateTime } from "@/utils/date";

export default function TokenHistoryPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getLoginHistory()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? data.filter(
        (r) =>
          String(r.token ?? "").toLowerCase().includes(search.toLowerCase()) ||
          String(r.ip ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : data;

  return (
    <div className="min-w-0">
      <PageHeader
        title="Token History"
        breadcrumbs={["Security", "Token History"]}
      />
      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </FilterBar>
          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>Date / Time</TableHead>
            <TableHead>Token (masked)</TableHead>
            <TableHead>IP</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={3} message="Loading…" />
            ) : filtered.length === 0 ? (
              <TableEmpty colSpan={3} message="No token history yet." />
            ) : (
              filtered.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>
                    {formatDateTime(row.date ?? row.createdAt ?? row.timestamp)}
                  </TableCell>
                  <TableCell>{String(row.token ?? "—").slice(0, 12)}…</TableCell>
                  <TableCell>{String(row.ip ?? "—")}</TableCell>
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
