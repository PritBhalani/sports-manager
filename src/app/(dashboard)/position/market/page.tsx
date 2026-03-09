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
} from "@/components";
import {
  getMarketPositionByMarketId,
  getFancyUserPosition,
} from "@/services/position.service";
import { formatCurrency } from "@/utils/formatCurrency";

export default function PositionMarketPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [fancyData, setFancyData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [marketId, setMarketId] = useState("");

  const handleLoad = () => {
    if (!marketId.trim()) return;
    setLoading(true);
    Promise.all([
      getMarketPositionByMarketId(marketId.trim()),
      getFancyUserPosition(marketId.trim()),
    ])
      .then(([marketPos, fancy]) => {
        setData(marketPos);
        setFancyData(fancy);
      })
      .catch(() => {
        setData([]);
        setFancyData([]);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-w-0">
      <PageHeader
        title="Position by Market"
        breadcrumbs={["Position", "Market"]}
      />
      <FilterBar className="mb-4">
        <Input
          placeholder="Market ID"
          value={marketId}
          onChange={(e) => setMarketId(e.target.value)}
          className="max-w-[200px]"
        />
        <Button variant="primary" onClick={handleLoad} disabled={loading}>
          {loading ? "Loading…" : "Load"}
        </Button>
      </FilterBar>
      <Card title="Market position" className="mb-4">
        <Table>
          <TableHeader>
            <TableHead>Market / Selection</TableHead>
            <TableHead align="right">Exposure</TableHead>
            <TableHead align="right">P&amp;L</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={3} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={3} message="Enter Market ID and click Load." />
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>
                    {String(row.marketName ?? row.selection ?? row.name ?? "—")}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(row.exposure ?? row.netExposure)}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(row.pl ?? row.profitLoss)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      <Card title="Fancy user position">
        <Table>
          <TableHeader>
            <TableHead>Selection / User</TableHead>
            <TableHead align="right">Exposure</TableHead>
            <TableHead align="right">P&amp;L</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={3} message="Loading…" />
            ) : fancyData.length === 0 ? (
              <TableEmpty colSpan={3} message="No fancy position for this market." />
            ) : (
              fancyData.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>
                    {String(row.selection ?? row.userName ?? row.name ?? "—")}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(row.exposure ?? row.netExposure)}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(row.pl ?? row.profitLoss)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
