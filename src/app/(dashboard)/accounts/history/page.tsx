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
  { id: "type", header: "Type", sortable: true, cell: (row: Row) => row.type },
  { id: "username", header: "User", sortable: true, cell: (row: Row) => row.username },
  {
    id: "amount",
    header: "Amount",
    sortable: true,
    cell: (row: Row) => `₹ ${formatCurrency(row.amount)}`,
    sortValue: (row: Row) => row.amount,
  },
  {
    id: "balanceAfter",
    header: "Balance After",
    sortable: true,
    cell: (row: Row) => `₹ ${formatCurrency(row.balanceAfter)}`,
    sortValue: (row: Row) => row.balanceAfter,
  },
];

export default function AccountsHistoryPage() {
  const rows = mockAccountTransactions;
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Account History"
        breadcrumbs={["Account", "History"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Entries" value={rows.length.toString()} />
        <StatsCard
          title="Total In"
          value={`₹ ${formatCurrency(
            rows
              .filter((t) => t.type === "Deposit" || t.type === "TransferIn")
              .reduce((sum, t) => sum + t.amount, 0),
          )}`}
        />
        <StatsCard
          title="Total Out"
          value={`₹ ${formatCurrency(
            rows
              .filter((t) => t.type === "Withdraw" || t.type === "TransferOut")
              .reduce((sum, t) => sum + t.amount, 0),
          )}`}
        />
        <StatsCard
          title="Net In/Out"
          value={`₹ ${formatCurrency(
            rows.reduce(
              (sum, t) =>
                sum +
                (t.type === "Deposit" || t.type === "TransferIn"
                  ? t.amount
                  : -t.amount),
              0,
            ),
          )}`}
        />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Input placeholder="Filter by user or type" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          initialSortColumnId="createdAt"
          initialSortDirection="desc"
          enableSearch
          searchPlaceholder="Search account history…"
          getSearchText={(row: Row) =>
            `${row.type} ${row.username} ${row.userCode} ${row.referenceId}`.toLowerCase()
          }
          emptyMessage="No account history."
        />
      </Card>
    </div>
  );
}

