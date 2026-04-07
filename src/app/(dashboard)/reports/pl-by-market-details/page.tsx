"use client";

import { useState, useCallback } from "react";
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
} from "@/components";
import { getPlByMarketDetails } from "@/services/betHistory.service";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { downloadCsv } from "@/utils/csvDownload";

/** README §5: GET /bethistory/getplbymarketdetails/{marketId}/ or /{marketId}/{parentId} */
export default function PlByMarketDetailsPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketId, setMarketId] = useState("");
  const [parentId, setParentId] = useState("");

  const handleLoad = () => {
    if (!marketId.trim()) {
      setError("Enter Market ID.");
      return;
    }
    setError(null);
    setLoading(true);
    getPlByMarketDetails(marketId.trim(), parentId.trim() || undefined)
      .then(setData)
      .catch((e) => {
        setData([]);
        setError(e instanceof Error ? e.message : "Failed to load P&L details.");
      })
      .finally(() => setLoading(false));
  };

  const exportDetailsCsv = useCallback(() => {
    downloadCsv(
      `pl-by-market-details-${marketId.trim() || "market"}.csv`,
      ["Date", "Market / Selection", "Stake", "P&L"],
      data.map((row) => [
        formatDateTime(row.date ?? row.createdAt),
        String(row.marketName ?? row.selection ?? ""),
        Number(row.stake ?? 0),
        Number(row.pl ?? row.profitLoss ?? 0),
      ]),
    );
  }, [data, marketId]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="P&L by Market Details"
        breadcrumbs={["Reports", "P&L by Market Details"]}
        description="README §5: GET getplbymarketdetails/{marketId}/ or /{marketId}/{parentId}"
        action={
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={exportDetailsCsv}
            disabled={loading || data.length === 0}
          >
            Export
          </Button>
        }
      />
      {error && (
        <p className="mb-2 text-sm text-error" role="alert">{error}</p>
      )}
      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
        <Input
          placeholder="Market ID *"
          value={marketId}
          onChange={(e) => setMarketId(e.target.value)}
          className="max-w-[200px]"
        />
        <Input
          placeholder="Parent ID (optional)"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          className="max-w-[180px]"
        />
        <Button variant="primary" onClick={handleLoad} disabled={loading}>
          {loading ? "Loading…" : "Load"}
        </Button>
          </FilterBar>
          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>Date</TableHead>
            <TableHead>Market / Selection</TableHead>
            <TableHead align="right">Stake</TableHead>
            <TableHead align="right">P&L</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={4} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={4} message="Enter Market ID and click Load." />
            ) : (
              data.map((row, i) => (
                <TableRow key={String(row.id ?? i)}>
                  <TableCell>{formatDateTime(row.date ?? row.createdAt)}</TableCell>
                  <TableCell>{String(row.marketName ?? row.selection ?? "—")}</TableCell>
                  <TableCell align="right">{formatCurrency(row.stake)}</TableCell>
                  <TableCell align="right">{formatCurrency(row.pl ?? row.profitLoss)}</TableCell>
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
