"use client";

import React from "react";
import DataGrid, { type DataGridProps, type DataGridColumn } from "@/components/tables/DataGrid";

export type DataTableProps<T extends Record<string, unknown>> = DataGridProps<T> & {
  loading?: boolean;
  onRowClick?: (row: T) => void;
};

export default function DataTable<T extends Record<string, unknown>>({
  loading = false,
  onRowClick,
  rows,
  pageSizeOptions = [10, 20, 50],
  initialPageSize = 10,
  emptyMessage = "No data available.",
  ...rest
}: DataTableProps<T>) {
  const enhancedColumns: DataGridColumn<T>[] = React.useMemo(
    () =>
      rest.columns.map((col) => ({
        align: "left",
        ...col,
      })),
    [rest.columns],
  );

  // Simple debug hook when something goes wrong in demo environments
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log("DataTable rows:", rows.length);
  }

  return (
    <div className="space-y-2">
      {loading && (
        <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
          Loading data…
        </div>
      )}
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="px-3 pt-2">
          <DataGrid
            {...rest}
            columns={enhancedColumns}
            rows={rows}
            pageSizeOptions={pageSizeOptions}
            initialPageSize={initialPageSize}
            emptyMessage={emptyMessage}
            getRowId={
              rest.getRowId ??
              ((row, index) => String((row as any)?.id ?? index))
            }
          />
        </div>
      </div>
    </div>
  );
}

