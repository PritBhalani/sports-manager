"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  DataTable,
  Button,
} from "@/components";
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
      cell: (row: Row) =>
        formatDateTime(
          row.issuedOn ?? row.date ?? row.createdAt ?? row.timestamp,
        ),
      sortValue: (row: Row) => {
        const v = row.issuedOn ?? row.date ?? row.createdAt ?? row.timestamp;
        return typeof v === "number" ? v : Date.parse(String(v ?? ""));
      },
      align: "left" as const,
    },
    {
      id: "ip",
      header: "IP",
      sortable: true,
      cell: (row: Row) => String(row.remoteIp ?? row.ip ?? "—"),
      align: "left" as const,
    },
    {
      id: "location",
      header: "Location",
      sortable: true,
      cell: (row: Row) =>
        String(row.location ?? row.provider ?? row.device ?? row.userAgent ?? "—"),
      align: "left" as const,
    },
    {
      id: "status",
      header: "Login Since",
      sortable: true,
      cell: (row: Row) => String(row.loginSince ?? row.status ?? "—"),
      align: "left" as const,
    },
  ];

  return (
    <div className="min-w-0">
      <PageHeader
        title="Login History"
        breadcrumbs={["Security", "User Groups"]}
      />
      {error && (
        <p className="mb-2 text-sm text-error" role="alert">
          {error}
        </p>
      )}
      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <ListTableSection>
            {loading ? (
              <p className="px-4 py-6 text-sm text-muted">Loading…</p>
            ) : (
              <DataTable
                columns={columns}
                rows={rows}
                initialSortColumnId="date"
                initialSortDirection="desc"
                enableSearch
                searchPlaceholder="Search by IP, location or provider"
                getSearchText={(row: Row) =>
                  `${row.remoteIp ?? row.ip ?? ""} ${row.location ?? ""} ${
                    row.provider ?? ""
                  } ${row.loginSince ?? ""}`
                    .toString()
                    .toLowerCase()
                }
                emptyMessage="No login history yet."
              />
            )}
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
