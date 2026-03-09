"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable } from "@/components";
import { mockUserActivity, MockUserActivity } from "@/mocks/activity.mock";
import { formatDateTime } from "@/utils/date";

type Row = MockUserActivity;

const columns = [
  {
    id: "createdAt",
    header: "Date / Time",
    sortable: true,
    cell: (row: Row) => formatDateTime(row.createdAt),
    sortValue: (row: Row) => Date.parse(row.createdAt),
  },
  { id: "type", header: "Type", sortable: true, cell: (row: Row) => row.type },
  { id: "username", header: "User", sortable: true, cell: (row: Row) => row.username },
];

export default function DashboardActivityPage() {
  const rows = mockUserActivity;
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Dashboard Activity"
        breadcrumbs={["Dashboard", "Activity"]}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Events (Demo)" value={rows.length.toString()} />
        <StatsCard
          title="Logins"
          value={rows.filter((a) => a.type === "Login").length.toString()}
        />
        <StatsCard
          title="Bet Activity"
          value={rows.filter((a) => a.type === "Bet Placed" || a.type === "Bet Settled").length.toString()}
        />
        <StatsCard
          title="Security Events"
          value={rows.filter((a) => a.module === "Security").length.toString()}
        />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Input placeholder="Filter by type or user" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          initialSortColumnId="createdAt"
          initialSortDirection="desc"
          enableSearch
          searchPlaceholder="Search activity…"
          getSearchText={(row: Row) =>
            `${row.type} ${row.username} ${row.module} ${row.description}`.toLowerCase()
          }
          emptyMessage="No activity."
        />
      </Card>
    </div>
  );
}

