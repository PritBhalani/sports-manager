"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable } from "@/components";
import { formatDateTime } from "@/utils/date";
import { mockUserActivity, MockUserActivity } from "@/mocks/activity.mock";

type Row = MockUserActivity;

const columns = [
  { id: "type", header: "Event Type", sortable: true, cell: (row: Row) => row.type },
  { id: "module", header: "Module", sortable: true, cell: (row: Row) => row.module },
  { id: "username", header: "User", sortable: true, cell: (row: Row) => row.username },
  {
    id: "createdAt",
    header: "Time",
    sortable: true,
    cell: (row: Row) => formatDateTime(row.createdAt),
    sortValue: (row: Row) => Date.parse(row.createdAt),
  },
  { id: "ipAddress", header: "IP", sortable: true, cell: (row: Row) => row.ipAddress },
  { id: "device", header: "Device", sortable: true, cell: (row: Row) => row.device },
];

export default function SecurityAnalyticsPage() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Security Analytics"
        breadcrumbs={["Token / Login History", "Analytics"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Events (Demo)" value={mockUserActivity.length.toString()} />
        <StatsCard
          title="Logins"
          value={mockUserActivity.filter((a) => a.type === "Login").length.toString()}
        />
        <StatsCard
          title="Bet Actions"
          value={mockUserActivity.filter((a) => a.module === "Bets").length.toString()}
        />
        <StatsCard
          title="Security Events"
          value={mockUserActivity.filter((a) => a.module === "Security").length.toString()}
        />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={mockUserActivity}
          initialSortColumnId="createdAt"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search events…"
          getSearchText={(row: Row) =>
            `${row.type ?? ""}`.toLowerCase()
          }
          emptyMessage="No security analytics data."
        />
      </Card>
    </div>
  );
}

