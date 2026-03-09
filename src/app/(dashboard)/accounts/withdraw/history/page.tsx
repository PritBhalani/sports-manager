"use client";

import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable } from "@/components";
import { mockAccountTransactions, MockAccountTransaction } from "@/mocks/accounts.mock";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";

type Row = MockAccountTransaction;

const columns = [
  {
    id: "createdAt",
    header: "Date / Time",
    sortable: true,
    cell: (row: Row) => formatDateTime(row.createdAt),
    sortValue: (row: Row) => Date.parse(row.createdAt),
  },
  { id: "username", header: "User", sortable: true, cell: (row: Row) => row.username },
  {
    id: "amount",
    header: "Amount",
    sortable: true,
    cell: (row: Row) => `₹ ${formatCurrency(row.amount)}`,
    sortValue: (row: Row) => row.amount,
  },
  {
    id: "channel",
    header: "Channel",
    sortable: true,
    cell: (row: Row) => row.channel,
  },
];

export default function WithdrawHistoryPage() {
  const rows = mockAccountTransactions.filter(
    (t) => t.type === "Withdraw" || t.type === "TransferOut",
  );
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Withdraw History"
        breadcrumbs={["Account", "Withdraw", "History"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Withdrawals" value={rows.length.toString()} />
        <StatsCard
          title="Total Amount"
          value={`₹ ${formatCurrency(rows.reduce((sum, t) => sum + t.amount, 0))}`}
        />
        <StatsCard
          title="Average Withdrawal"
          value={`₹ ${formatCurrency(
            rows.length ? rows.reduce((sum, t) => sum + t.amount, 0) / rows.length : 0,
          )}`}
        />
        <StatsCard
          title="Unique Users"
          value={new Set(rows.map((t) => t.username)).size.toString()}
        />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Input placeholder="Filter by user or method" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          initialSortColumnId="createdAt"
          initialSortDirection="desc"
          enableSearch
          searchPlaceholder="Search withdrawals…"
          getSearchText={(row: Row) =>
            `${row.username} ${row.userCode} ${row.referenceId} ${row.channel}`.toLowerCase()
          }
          emptyMessage="No withdrawals."
        />
      </Card>
    </div>
  );
}

