"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Card, DataGrid, Button } from "@/components";
import { getLoginHistory } from "@/services/token.service";
import { formatDateTime } from "@/utils/date";

type Row = Record<string, unknown>;

export default function LoginHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLoading(true);
    setError(null);
    getLoginHistory()
      .then(setRows)
      .catch((e) => {
        setRows([]);
        setError(e instanceof Error ? e.message : "Failed to load login history.");
      })
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      id: "date",
      header: "Date / Time",
      sortable: true,
      cell: (row: Row) => formatDateTime(row.date ?? row.createdAt ?? row.timestamp),
      sortValue: (row: Row) => {
        const v = row.date ?? row.createdAt ?? row.timestamp;
        return typeof v === "number" ? v : Date.parse(String(v ?? ""));
      },
      align: "left" as const,
    },
    {
      id: "ip",
      header: "IP",
      sortable: true,
      cell: (row: Row) => String(row.ip ?? "—"),
      align: "left" as const,
    },
    {
      id: "device",
      header: "Device",
      sortable: true,
      cell: (row: Row) => String(row.device ?? row.userAgent ?? "—"),
      align: "left" as const,
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (row: Row) => String(row.status ?? "—"),
      align: "left" as const,
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: Row) => {
        const id = String(row.id ?? "");
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => id && router.push(`/security/login-history/${id}`)}
            >
              View Details
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-w-0">
      <PageHeader
        title="Login History"
        breadcrumbs={["Security", "Login History"]}
      />
      {error && (
        <p className="mb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Card>
        {loading ? (
          <p className="px-4 py-6 text-sm text-zinc-500">Loading…</p>
        ) : (
          <DataGrid
            columns={columns}
            rows={rows}
            initialSortColumnId="date"
            initialSortDirection="desc"
            enableSearch
            searchPlaceholder="Search by IP, device or status"
            getSearchText={(row: Row) =>
              `${row.ip ?? ""} ${row.device ?? row.userAgent ?? ""} ${row.status ?? ""}`
                .toString()
                .toLowerCase()
            }
            emptyMessage="No login history yet."
          />
        )}
      </Card>
    </div>
  );
}
