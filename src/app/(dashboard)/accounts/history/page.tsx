"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Badge,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components";
import { Pencil, Plus } from "lucide-react";

type BankingRow = {
  id: string;
  accountNo: string;
  bank: string;
  accountHolder: string;
  ifsc: string;
  type: string;
  whatsapp: string;
  telegram: string;
  status: "active" | "inactive";
};

const MOCK_ROWS: BankingRow[] = [
  {
    id: "1",
    accountNo: "123456789012",
    bank: "HDFC Bank",
    accountHolder: "Ravi Kumar",
    ifsc: "HDFC0001234",
    type: "Savings",
    whatsapp: "9876543210",
    telegram: "@ravikumar",
    status: "active",
  },
  {
    id: "2",
    accountNo: "001122334455",
    bank: "ICICI Bank",
    accountHolder: "Amit Shah",
    ifsc: "ICIC0003321",
    type: "Current",
    whatsapp: "9898989898",
    telegram: "@amitshah",
    status: "inactive",
  },
];

export default function AccountsHistoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    return MOCK_ROWS.filter((row) => {
      const statusOk = status === "all" || row.status === status;
      const q = search.trim().toLowerCase();
      if (!q) return statusOk;
      const text =
        `${row.accountNo} ${row.bank} ${row.accountHolder} ${row.ifsc} ${row.type} ${row.whatsapp} ${row.telegram}`.toLowerCase();
      return statusOk && text.includes(q);
    });
  }, [search, status]);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <PageHeader
        title="Website Banking"
        breadcrumbs={["Website", "Banking"]}
        action={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" aria-hidden />}
          >
            Add Account
          </Button>
        }
      />

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4 sm:px-6">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search account, bank, holder, IFSC"
            className="h-9 w-full sm:w-[300px]"
          />
          <Select
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { label: "All Status", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
            className="h-9 w-[180px]"
          />
        </div>

        <Table>
          <TableHeader className="bg-surface">
            <TableHead className="font-bold text-foreground-secondary">A/C Number</TableHead>
            <TableHead className="font-bold text-foreground-secondary">Bank</TableHead>
            <TableHead className="font-bold text-foreground-secondary">A/C Holder</TableHead>
            <TableHead className="font-bold text-foreground-secondary">IFSC</TableHead>
            <TableHead className="font-bold text-foreground-secondary">Type</TableHead>
            <TableHead className="font-bold text-foreground-secondary">Whatsapp</TableHead>
            <TableHead className="font-bold text-foreground-secondary">Telegram</TableHead>
            <TableHead className="font-bold text-foreground-secondary">Status</TableHead>
            <TableHead  className="font-bold text-foreground-secondary">
              Action
            </TableHead>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableEmpty colSpan={9} message="No banking accounts found." />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-foreground">{row.accountNo}</TableCell>
                  <TableCell>{row.bank}</TableCell>
                  <TableCell>{row.accountHolder}</TableCell>
                  <TableCell className="font-mono text-xs">{row.ifsc}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.whatsapp}</TableCell>
                  <TableCell>{row.telegram}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "active" ? "success" : "default"}>
                      {row.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell >
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border text-foreground-tertiary hover:bg-surface-muted hover:text-foreground"
                      aria-label="Edit account"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

