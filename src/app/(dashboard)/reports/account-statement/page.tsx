"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { getAgentOffers, type AgentOffer } from "@/services/offer.service";

function formatOfferDate(date: string): string {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function mapOfferOn(value: number): string {
  if (value === 1) return "OnFirstDep...";
  return String(value || "-");
}

function mapOfferType(value: number): string {
  if (value === 1) return "Fixed";
  if (value === 2) return "Percentage";
  return String(value || "-");
}

export default function BonusManageOffersPage() {
  const { page, pageSize, setPage, setPageSize, pageSizeOptions } = usePagination();
  const [rows, setRows] = useState<AgentOffer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAgentOffers({ page, pageSize })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setTotal(res.total);
      })
      .catch((e) => {
        if (cancelled) return;
        setRows([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load offers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Manage Offers"
        breadcrumbs={["Bonus", "Bonus"]}
        action={
          <Button variant="primary" size="sm">
            Add New
          </Button>
        }
      />

      {error ? (
        <p className="mb-3 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>Name</TableHead>
            <TableHead>Offer On</TableHead>
            <TableHead>Offer Type</TableHead>
            <TableHead align="right">Value</TableHead>
            <TableHead align="center">Offer Used/Budget</TableHead>
            <TableHead align="center">User Count/Max</TableHead>
            <TableHead align="right">Order</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead align="center">Action</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={10} message="Loading offers..." />
            ) : rows.length === 0 ? (
              <TableEmpty colSpan={10} message="No offers found." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title || "-"}</TableCell>
                  <TableCell>{mapOfferOn(row.offerOn)}</TableCell>
                  <TableCell>{mapOfferType(row.offerType)}</TableCell>
                  <TableCell align="right">{row.value}</TableCell>
                  <TableCell align="center">
                    {row.offerUserUsed}/{row.offerUsedBudget}
                  </TableCell>
                  <TableCell align="center">
                    {row.offerUserUsed}/{row.splitBonus}
                  </TableCell>
                  <TableCell align="right">{row.displayOrder}</TableCell>
                  <TableCell>{formatOfferDate(row.startDate)}</TableCell>
                  <TableCell>{formatOfferDate(row.endDate)}</TableCell>
                  <TableCell align="center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Edit offer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-surface text-success transition-colors hover:bg-surface-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete offer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-surface text-error transition-colors hover:bg-surface-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
