"use client";

import { useState, useEffect, useCallback } from "react";
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
  TablePagination,
} from "@/components";
import { getDownline } from "@/services/account.service";
import { getSessionMemberId } from "@/services/user.service";
import { formatDateTime } from "@/utils/date";
import { downloadCsv } from "@/utils/csvDownload";

const PAGE_SIZE = 15;

export default function PlayerMasterPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const userId = getSessionMemberId();
    if (!userId) {
      setData([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    getDownline(
      { page, pageSize, orderByDesc: true },
      { username: search.trim() || undefined },
      userId
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

  const exportMasterCsv = useCallback(() => {
    downloadCsv(
      "player-master.csv",
      ["Username", "User code", "Type", "Status", "Registered"],
      data.map((row) => [
        String(row.username ?? ""),
        String(row.userCode ?? ""),
        String(row.type ?? ""),
        String(row.status ?? ""),
        formatDateTime(row.createdAt ?? row.registeredAt),
      ]),
    );
  }, [data]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Player Master"
        breadcrumbs={["Reports", "Player Master"]}
        action={
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={exportMasterCsv}
            disabled={loading || data.length === 0}
          >
            Export
          </Button>
        }
      />
      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
            <Input
              placeholder="Search player"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </FilterBar>
          <ListTableSection>
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
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
