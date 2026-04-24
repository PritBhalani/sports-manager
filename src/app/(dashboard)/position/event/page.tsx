"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components";
import { getEventTypePosition } from "@/services/position.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";

export default function PositionEventPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getEventTypePosition()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Position by Event Type"
        breadcrumbs={["Position", "Event"]}
      />
      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>Event Type / Sport</TableHead>
            <TableHead >Exposure</TableHead>
            <TableHead >P&amp;L</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={3} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={3} message="No position data yet." />
            ) : (
              data.map((row, i) => {
                const exp = Number(row.exposure ?? row.netExposure ?? 0);
                const pl = Number(row.pl ?? row.profitLoss ?? 0);
                return (
                <TableRow key={i}>
                  <TableCell>
                    {String(row.eventTypeName ?? row.sportName ?? row.name ?? "—")}
                  </TableCell>
                  <TableCell  className={`tabular-nums ${signedAmountTextClass(exp)}`}>
                    {formatCurrency(row.exposure ?? row.netExposure)}
                  </TableCell>
                  <TableCell  className={`tabular-nums ${signedAmountTextClass(pl)}`}>{formatCurrency(row.pl ?? row.profitLoss)}</TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
            </Table>
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
