"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
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
import { usePagination } from "@/hooks/usePagination";
import { RefreshCw } from "lucide-react";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { getFdRunningExposure, type FdRunningExposureRow } from "@/services/fdstudio.service";

export default function CasinoBetListPage() {
  const { page, pageSize, setPage, setPageSize, pageSizeOptions } = usePagination();
  const [data, setData] = useState<FdRunningExposureRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getFdRunningExposure({
      page,
      pageSize,
      groupBy: "",
      orderBy: "",
      orderByDesc: false,
    })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .catch((e) => {
        setData([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load running exposure.");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="Casino | Bet List"
        breadcrumbs={["Casino", "Bet List"]}
        action={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refresh Data
          </Button>
        }
      />
      {error && (
        <p className="mb-2 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>Name</TableHead>
            <TableHead>Table Name</TableHead>
            <TableHead>Round Id</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead align="right">Credit</TableHead>
            <TableHead align="right">Debit</TableHead>
            <TableHead>Is PL?</TableHead>
            <TableHead>Created</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={8} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={8} message="No running exposure records." />
            ) : (
              data.map((row, i) => (
                <TableRow key={String(row.id ?? row.roundId ?? i)}>
                  <TableCell>{String(row.name ?? row.username ?? "—")}</TableCell>
                  <TableCell>{String(row.tableName ?? row.table ?? "—")}</TableCell>
                  <TableCell>{String(row.roundId ?? "—")}</TableCell>
                  <TableCell>{String(row.provider ?? row.vendor ?? "—")}</TableCell>
                  <TableCell align="right" className="tabular-nums">
                    {formatCurrency(row.credit ?? 0)}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums">
                    {formatCurrency(row.debit ?? 0)}
                  </TableCell>
                  <TableCell>{row.isPl ? "Yes" : "No"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(row.createdOn ?? row.createdAt)}
                  </TableCell>
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
              onPageSizeChange={setPageSize}
              pageSizeOptions={pageSizeOptions}
            />
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
