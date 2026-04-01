"use client";

import { useState } from "react";
import { Input, Select } from "@/components";
import ListFilterPanel from "./ListFilterPanel";

export type ListRequestFiltersOption = { label: string; value: string };

export type ListRequestFiltersGridProps = {
  username: string;
  onUsernameChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: ListRequestFiltersOption[];
  fromDate?: string;
  toDate?: string;
  onFromDateChange?: (value: string) => void;
  onToDateChange?: (value: string) => void;
  onSearch: () => void;
  onExport?: () => void;
  exportDisabled?: boolean;
  searchPlaceholder?: string;
  /**
   * `simple`: username/mobile + status + date range + Search (no depositors/modes/accounts, no export).
   */
  variant?: "default" | "simple";
};

const fieldWidthClass = "min-w-[8rem] sm:min-w-[12rem]";
const compactWidthClass = "min-w-[8rem]";
const dateInputClass = "max-w-[170px]";

function FiltersGridBody({
  layoutVariant,
  viewportVariant,
  searchPlaceholder,
  username,
  onUsernameChange,
  status,
  onStatusChange,
  statusOptions,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onSearch,
  onExport,
  exportDisabled,
}: ListRequestFiltersGridProps & {
  layoutVariant: "default" | "simple";
  viewportVariant: "mobile" | "desktop";
}) {
  const isMobile = viewportVariant === "mobile";
  const isSimple = layoutVariant === "simple";

  if (isSimple) {
    return (
      <>
        <Input
          placeholder={searchPlaceholder ?? "Search username or mobile"}
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className={isMobile ? "w-full" : fieldWidthClass}
          aria-label="Search username or mobile"
        />
        <Select
          label="Status"
          options={statusOptions}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Status"
          className={isMobile ? "w-full" : fieldWidthClass}
        />
        <Input
          type="date"
          value={fromDate ?? ""}
          onChange={(e) => onFromDateChange?.(e.target.value)}
          className={isMobile ? "w-full max-w-none" : dateInputClass}
          aria-label="From date"
        />
        <Input
          type="date"
          value={toDate ?? ""}
          onChange={(e) => onToDateChange?.(e.target.value)}
          className={isMobile ? "w-full max-w-none" : dateInputClass}
          aria-label="To date"
        />
        <div
          className={
            isMobile
              ? "flex w-full justify-stretch"
              : "flex flex-wrap items-center gap-2"
          }
        >
          <button
            type="button"
            onClick={onSearch}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white"
          >
            Search
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Input
        placeholder={searchPlaceholder ?? "Search username, txn/utr code"}
        value={username}
        onChange={(e) => onUsernameChange(e.target.value)}
        className={fieldWidthClass}
        aria-label="Search username or transaction code"
      />
      <Select
        options={[]}
        placeholder="All Depositors"
        defaultValue=""
        aria-label="Depositors"
        className={fieldWidthClass}
      />
      <Select
        options={[]}
        placeholder="All Modes"
        defaultValue=""
        aria-label="Modes"
        className={compactWidthClass}
      />
      <Select
        options={[]}
        placeholder="All Accounts"
        defaultValue=""
        aria-label="Accounts"
        className={compactWidthClass}
      />
      <Select
        options={statusOptions}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Status"
        className={isMobile ? `${compactWidthClass} w-full` : undefined}
      />

      <div
        className={
          isMobile
            ? "flex flex-col gap-2"
            : "flex flex-wrap items-center gap-2 sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-5"
        }
      >
        <Input
          type="date"
          value={fromDate ?? ""}
          onChange={(e) => onFromDateChange?.(e.target.value)}
          className={isMobile ? "w-full max-w-none" : dateInputClass}
          aria-label="From date"
        />
        <Input
          type="date"
          value={toDate ?? ""}
          onChange={(e) => onToDateChange?.(e.target.value)}
          className={isMobile ? "w-full max-w-none" : dateInputClass}
          aria-label="To date"
        />

        <div className="flex flex-wrap justify-center gap-2 sm:flex-none sm:justify-start">
          <button
            type="button"
            onClick={onSearch}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white"
          >
            Search
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="flex h-9 max-w-max items-center rounded-md bg-primary px-4 text-sm font-medium text-white disabled:opacity-70"
          >
            Export
          </button>
        </div>
      </div>
    </>
  );
}

export default function ListRequestFiltersGrid(props: ListRequestFiltersGridProps) {
  const [mobileOpen, setMobileOpen] = useState(() => props.variant === "simple");

  const {
    searchPlaceholder: propSearchPlaceholder,
    variant: layoutVariant = "default",
  } = props;

  const searchPlaceholder =
    layoutVariant === "simple"
      ? (propSearchPlaceholder ?? "Search username or mobile")
      : (propSearchPlaceholder ?? "Search username, txn/utr code");

  const desktopGridClass =
    layoutVariant === "simple"
      ? "hidden sm:flex sm:flex-1 sm:flex-wrap sm:items-end sm:gap-3 bg-neutral-200 px-5 pb-4 pt-4"
      : "hidden sm:grid flex-1 gap-3 bg-neutral-200 px-5 pb-4 pt-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  return (
    <ListFilterPanel
      mobileToggle={{
        label: mobileOpen ? "Hide Filters" : "Show Filters",
        onClick: () => setMobileOpen((o) => !o),
      }}
    >
      {mobileOpen ? (
        <div className="grid grid-cols-1 gap-3 px-5 pb-4 pt-2 sm:hidden">
          <FiltersGridBody
            {...props}
            searchPlaceholder={searchPlaceholder}
            layoutVariant={layoutVariant}
            viewportVariant="mobile"
          />
        </div>
      ) : null}

      <div className={desktopGridClass}>
        <FiltersGridBody
          {...props}
          searchPlaceholder={searchPlaceholder}
          layoutVariant={layoutVariant}
          viewportVariant="desktop"
        />
      </div>
    </ListFilterPanel>
  );
}
