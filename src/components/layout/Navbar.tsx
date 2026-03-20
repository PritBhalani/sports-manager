"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Menu, X, LogOut } from "lucide-react";
import { getAuthSession } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";

export type NavbarBalances = {
  balance: string;
  balanceDown: string;
  creditLimit: string;
  availableCredit: string;
};

type NavbarProps = {
  onMenuClick?: () => void;
  balances?: NavbarBalances;
  userInitial?: string;
};

const DEFAULT_BALANCES: NavbarBalances = {
  balance: "—",
  balanceDown: "—",
  creditLimit: "—",
  availableCredit: "—",
};

function BalanceStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[4.25rem] shrink-0 text-right md:min-w-[5rem]">
      <p className="truncate text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}

function roleLabel(session: ReturnType<typeof getAuthSession>): string {
  const claims = session.claims ?? [];
  if (claims.some((c) => String(c).toLowerCase().includes("admin"))) {
    return "Admin";
  }
  const userType = session.user?.userType;
  if (userType === 1 || userType === 0) return "Admin";
  return "User";
}

function displayName(session: ReturnType<typeof getAuthSession>): string {
  const u = session.user;
  return (
    (u?.username as string) ||
    (u?.userCode as string) ||
    session.parent?.username ||
    "Profile"
  );
}

function currencyLabel(session: ReturnType<typeof getAuthSession>): string {
  const c = session.currency;
  const code = (c?.code as string) || (c?.name as string);
  return code ? `Currency ${code}` : "Currency —";
}

function timezoneLabel(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz ? `Timezone ${tz}` : "Timezone —";
  } catch {
    return "Timezone —";
  }
}

export default function Navbar({
  onMenuClick,
  balances: balancesProp,
  userInitial,
}: NavbarProps) {
  const balances = balancesProp ?? DEFAULT_BALANCES;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { logout } = useAuth();
  const [session, setSession] = useState(getAuthSession);

  // Avoid hydration mismatch: server has no localStorage session; client may have
  // a different user initial. Render a stable placeholder until after mount.
  useEffect(() => {
    setMounted(true);
    setSession(getAuthSession());
  }, []);

  useEffect(() => {
    if (open) setSession(getAuthSession());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const initial = mounted
    ? (
        userInitial ||
        (displayName(session).charAt(0) || "U").toUpperCase()
      )
    : "?";

  const handleLogout = useCallback(() => {
    setOpen(false);
    logout();
  }, [logout]);

  return (
    <header className="relative flex h-14 flex-shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 sm:gap-4 sm:px-4 md:h-16">
      {/* Left: toggle + search */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:h-9 sm:w-9"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative min-w-0 flex-1 sm:max-w-xs md:max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 sm:left-3" />
          <input
            type="search"
            placeholder="Search"
            className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 sm:h-9 sm:pl-9 sm:pr-20"
          />
          <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-zinc-400 sm:inline">
            Ctrl + K
          </span>
        </div>
      </div>

      {/* Right: balance strip (GET /account/getbalance), profile */}
      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
        <div className="hidden max-w-[min(52vw,28rem)] items-center gap-2 overflow-x-auto sm:flex md:max-w-none md:gap-3 lg:gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <BalanceStat label="Balance" value={balances.balance} />
          <div className="h-8 w-px shrink-0 bg-zinc-200" aria-hidden />
          <BalanceStat label="Balance down" value={balances.balanceDown} />
          <div className="h-8 w-px shrink-0 bg-zinc-200" aria-hidden />
          <BalanceStat label="Credit limit" value={balances.creditLimit} />
          <div className="h-8 w-px shrink-0 bg-zinc-200" aria-hidden />
          <BalanceStat label="Avilable credit" value={balances.availableCredit} />
        </div>
        {/* Compact: primary balance + available credit on very small screens */}
        <div className="flex max-w-[42vw] min-w-0 flex-col gap-0.5 rounded-lg bg-zinc-100 px-2 py-1.5 text-zinc-700 sm:hidden">
          <div className="flex items-baseline justify-between gap-2 text-[10px]">
            <span className="shrink-0 font-medium uppercase tracking-wide text-zinc-500">
              Balance
            </span>
            <span className="truncate font-semibold tabular-nums text-zinc-900">
              {balances.balance}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 text-[10px]">
            <span className="shrink-0 font-medium uppercase tracking-wide text-zinc-500">
              Avilable credit
            </span>
            <span className="truncate font-semibold tabular-nums text-zinc-900">
              {balances.availableCredit}
            </span>
          </div>
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-300 sm:h-9 sm:w-9 sm:text-sm"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Open profile menu"
        >
          {initial}
        </button>
      </div>

      {/* Profile dropdown – matches reference: avatar, role, timezone, currency, actions, balances, logout */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Profile menu"
          className="absolute right-3 top-full z-50 mt-2 w-[min(calc(100vw-1.5rem),20rem)] rounded-xl border border-zinc-200 bg-white shadow-lg sm:right-4"
        >
          <div className="relative px-4 pb-4 pt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center pt-2 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-700">
                {initial}
              </div>
              <p className="mt-3 text-sm font-bold text-zinc-900">
                {displayName(session)}
              </p>
              <p className="mt-0.5 text-sm text-zinc-700">{roleLabel(session)}</p>
              <p className="mt-1 text-xs text-zinc-600">{timezoneLabel()}</p>
              <p className="mt-0.5 text-xs text-zinc-600">
                {currencyLabel(session)}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                My Profile
              </Link>
              <Link
                href="/reports/account-statement"
                onClick={() => setOpen(false)}
                className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                A/c Statement
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 px-3 py-3">
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Balance
                </span>
                <span className="mt-1 text-sm font-bold tabular-nums text-zinc-900">
                  {balances.balance}
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Balance down
                </span>
                <span className="mt-1 text-sm font-bold tabular-nums text-zinc-900">
                  {balances.balanceDown}
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Credit limit
                </span>
                <span className="mt-1 text-sm font-bold tabular-nums text-zinc-900">
                  {balances.creditLimit}
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Avilable credit
                </span>
                <span className="mt-1 text-sm font-bold tabular-nums text-zinc-900">
                  {balances.availableCredit}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
