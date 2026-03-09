"use client";

import {
  PageHeader,
  Card,
  Button,
  FilterBar,
  Switch,
  Badge,
} from "@/components/ui";
import { Input, Select } from "@/components/forms";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components/tables";
import { Search } from "lucide-react";

export default function NotificationsPage() {
  const totalItems = 0;
  const page = 1;
  const pageSize = 15;

  return (
    <div className="min-w-0">
      <PageHeader
        title="Notifications"
        breadcrumbs={["Settings", "Notifications"]}
        action={
          <Button size="md" leftIcon={<Search className="h-4 w-4" />}>
            Create
          </Button>
        }
      />

      <FilterBar className="mb-4">
        <Input
          placeholder="Search..."
          leftIcon={<Search className="h-4 w-4" />}
          className="max-w-xs"
        />
        <Select
          options={[
            { value: "all", label: "All Types" },
            { value: "email", label: "Email" },
          ]}
          placeholder="All Types"
          className="w-40"
        />
        <Button variant="primary">Export</Button>
      </FilterBar>

      <Card>
        <Table>
          <TableHeader>
            <TableHead>Type</TableHead>
            <TableHead>Message</TableHead>
            <TableHead align="center">Status</TableHead>
            <TableHead>Created</TableHead>
          </TableHeader>
          <TableBody>
            {totalItems === 0 ? (
              <TableEmpty colSpan={4} message="No notifications yet!" />
            ) : (
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Sample</TableCell>
                <TableCell align="center">
                  <Badge variant="success">Active</Badge>
                </TableCell>
                <TableCell>—</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          page={page}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />
      </Card>

      <Card title="Preferences" className="mt-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-700">Email notifications</span>
            <Switch defaultChecked label="" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-700">Push notifications</span>
            <Switch label="" />
          </div>
        </div>
      </Card>
    </div>
  );
}
