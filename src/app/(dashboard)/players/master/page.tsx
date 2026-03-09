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
  TablePagination,
} from "@/components";
import { getDownline } from "@/services/account.service";
import { CURRENT_USER_ID } from "@/utils/constants";
import { formatDateTime } from "@/utils/date";

const PAGE_SIZE = 15;

export default function PlayerMasterPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getDownline(
      { page, pageSize, orderByDesc: true },
      { username: search.trim() || undefined },
      CURRENT_USER_ID
    )
      .then((res) => {
        const list = res?.data ?? [];
        setData(Array.isArray(list) ? list : []);
        setTotal(res?.total ?? 0);
      })
      .catch(() => {
        setData([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, search]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Player Master"
        breadcrumbs={["Players", "Master"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />
      <FilterBar className="mb-4">
        <Input
          placeholder="Search player"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </FilterBar>
      <Card>
        <Table>
          <TableHeader>
            <TableHead>Username</TableHead>
            <TableHead>User code</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Registered</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={5} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={5} message="No players yet." />
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{String(row.username ?? "—")}</TableCell>
                  <TableCell>{String(row.userCode ?? "—")}</TableCell>
                  <TableCell>{String(row.type ?? "—")}</TableCell>
                  <TableCell>{String(row.status ?? "—")}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt ?? row.registeredAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          page={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </Card>
    </div>
  );
}
