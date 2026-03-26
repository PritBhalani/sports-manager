"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components";
import { getEventType } from "@/services/eventtype.service";

export default function EventTypesPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEventType()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Event Types"
        breadcrumbs={["Website", "External Integrations"]}
        description="Sports / event types (GET /eventtype/geteventtype)"
      />
      <Card>
        <Table>
          <TableHeader>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={3} message="Loading…" />
            ) : data.length === 0 ? (
              <TableEmpty colSpan={3} message="No event types." />
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{String(row.id ?? row.eventTypeId ?? "—")}</TableCell>
                  <TableCell>{String(row.name ?? row.eventTypeName ?? "—")}</TableCell>
                  <TableCell>{String(row.code ?? row.eventTypeCode ?? "—")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
