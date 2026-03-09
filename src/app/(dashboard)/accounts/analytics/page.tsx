"use client";

import { useRouter } from "next/navigation";
import { PageHeader, Card, FilterBar, Input, Button, StatsCard, DataTable, Badge } from "@/components";
import { formatCurrency } from "@/utils/formatCurrency";
import { mockAccountTransactions, MockAccountTransaction } from "@/mocks/accounts.mock";

type Row = MockAccountTransaction;

export default function AccountsAnalyticsPage() {
  const router = useRouter();

  const columns = [
    { id: "username", header: "User", sortable: true, cell: (row: Row) => row.username },
    { id: "userCode", header: "User Code", sortable: true, cell: (row: Row) => row.userCode },
    {
      id: "type",
      header: "Type",
      sortable: true,
      cell: (row: Row) => row.type.replace("Transfer", "Transfer "),
    },
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
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (row: Row) => (
        <Badge
          variant={
            row.status === "Completed"
              ? "success"
              : row.status === "Pending"
              ? "warning"
              : "error"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      cell: (row: Row) => {
        const id = row.userId;
        if (!id) return null;
        return (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/players/${id}/balance`)}
            >
              View Balance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/players/${id}/activity`)}
            >
              View Activity
            </Button>
          </div>
        );
      },
    },
  ];

  const rows = mockAccountTransactions;
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Account Analytics"
        breadcrumbs={["Account", "Analytics"]}
        action={<Button variant="primary" size="sm">Export</Button>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Transactions" value={rows.length.toString()} />
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
          title="Completed"
          value={rows.filter((t) => t.status === "Completed").length.toString()}
        />
      </div>

      <Card>
        <FilterBar className="mb-4">
          <Input type="date" className="max-w-[160px]" />
          <Input type="date" className="max-w-[160px]" />
          <Input placeholder="Search user or code" className="max-w-xs" />
          <Button variant="primary">Filter</Button>
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          initialSortColumnId="username"
          initialSortDirection="asc"
          enableSearch
          searchPlaceholder="Search accounts…"
          getSearchText={(row: Row) =>
            `${row.username} ${row.userCode}`.toLowerCase()
          }
          emptyMessage="No account analytics data."
        />
      </Card>
    </div>
  );
}

