"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { getAuthSession } from "@/store/authStore";
import { useAuth } from "@/hooks/useAuth";
import CommandPalette from "@/components/layout/CommandPalette";

export type NavbarBalances = {
  balance: string;
  balanceDown: string;
  netExposure: string;
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
  netExposure: "—",
  creditLimit: "—",
  availableCredit: "—",
};

function parseMaybeNumber(value: string): number | null {
  // "0.00" (and other formatted numbers like "1,200.00") -> 0 / number
  if (!value || value === "—") return null;
  const cleaned = value.replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function shouldShowBalanceField(value: string): boolean {
  const n = parseMaybeNumber(value);
  // Only hide when we can confidently parse it as 0.
  return n === null ? true : n !== 0;
}

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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [useMacShortcut, setUseMacShortcut] = useState(false);
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
    try {
      if (/Mac|iPod|iPhone|iPad/.test(navigator.platform)) {
        setUseMacShortcut(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (profileMenuOpen) setSession(getAuthSession());
  }, [profileMenuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) {
        return;
      }
      setProfileMenuOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [profileMenuOpen]);

  const initial = mounted
    ? (
        userInitial ||
        (displayName(session).charAt(0) || "U").toUpperCase()
      )
    : "?";

  const handleLogout = useCallback(() => {
    setProfileMenuOpen(false);
    logout();
  }, [logout]);

  return (
    <header className="relative flex h-14 flex-shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 sm:gap-4 sm:px-4 md:h-16">
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Left: toggle + search */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 sm:h-9 sm:w-9"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-sm bg-gray-100 px-3 py-1.5 text-neutral-700 transition-colors hover:bg-gray-200 max-w-[min(100%,7rem)] sm:max-w-32 md:max-w-36 lg:max-w-[9.5rem] xl:w-[160px] xl:max-w-none xl:flex-none"
          aria-label="Search pages"
        >
          <div className="shrink-0 text-xs leading-none" aria-hidden>
            <svg viewBox="0 0 24 24" className="size-[1em]">
              <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M18.319 14.4326C20.7628 11.2941 20.542 6.75347 17.6569 3.86829C14.5327 0.744098 9.46734 0.744098 6.34315 3.86829C3.21895 6.99249 3.21895 12.0578 6.34315 15.182C9.22833 18.0672 13.769 18.2879 16.9075 15.8442C16.921 15.8595 16.9351 15.8745 16.9497 15.8891L21.1924 20.1317C21.5829 20.5223 22.2161 20.5223 22.6066 20.1317C22.9971 19.7412 22.9971 19.1081 22.6066 18.7175L18.364 14.4749C18.3493 14.4603 18.3343 14.4462 18.319 14.4326ZM16.2426 5.28251C18.5858 7.62565 18.5858 11.4246 16.2426 13.7678C13.8995 16.1109 10.1005 16.1109 7.75736 13.7678C5.41421 11.4246 5.41421 7.62565 7.75736 5.28251C10.1005 2.93936 13.8995 2.93936 16.2426 5.28251Z"
              />
            </svg>
          </div>
          <p className="min-w-0 flex-1 truncate pr-2 text-xs">Search</p>
          <div className="hidden shrink-0 items-center md:flex" aria-hidden>
            <kbd className="text-xs font-bold">{useMacShortcut ? "⌘" : "Ctrl"}</kbd>
            <span className="mx-1">+</span>
            <kbd className="text-xs font-bold">K</kbd>
          </div>
        </button>
      </div>

      {/* Right: balance strip (GET /account/getbalance), profile */}
      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3 md:gap-4">
        {(() => {
          const items = [
            { key: "balance", label: "Balance", value: balances.balance },
            { key: "balanceDown", label: "Balance down", value: balances.balanceDown },
            { key: "netExposure", label: "Net Exposure", value: balances.netExposure },
            { key: "creditLimit", label: "Credit limit", value: balances.creditLimit },
            { key: "availableCredit", label: "Avilable credit", value: balances.availableCredit },
          ].filter((x) => shouldShowBalanceField(x.value));

          return (
            <div className="hidden max-w-[min(52vw,28rem)] items-center gap-2 overflow-x-auto sm:flex md:max-w-none md:gap-3 lg:gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {items.map((it, idx) => (
                <Fragment key={it.key}>
                  <BalanceStat label={it.label} value={it.value} />
                  {idx < items.length - 1 && (
                    <div className="h-8 w-px shrink-0 bg-zinc-200" aria-hidden />
                  )}
                </Fragment>
              ))}
            </div>
          );
        })()}
        {/* Compact: primary balance + available credit on very small screens */}
        {(() => {
          const mobileOrder = [
            { key: "balance", label: "Balance", value: balances.balance },
            { key: "netExposure", label: "Net Exposure", value: balances.netExposure },
            { key: "availableCredit", label: "Avilable credit", value: balances.availableCredit },
          ].filter((x) => shouldShowBalanceField(x.value));

          return (
            <div className="flex max-w-[42vw] min-w-0 flex-col gap-0.5 rounded-sm bg-zinc-100 px-2 py-1.5 text-zinc-700 sm:hidden">
              {mobileOrder.map((it) => (
                <div
                  key={it.key}
                  className="flex items-baseline justify-between gap-2 text-[10px]"
                >
                  <span className="shrink-0 font-medium uppercase tracking-wide text-zinc-500">
                    {it.label}
                  </span>
                  <span className="truncate font-semibold tabular-nums text-zinc-900">
                    {it.value}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setProfileMenuOpen((o) => !o)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-300 sm:h-9 sm:w-9 sm:text-sm"
          aria-expanded={profileMenuOpen}
          aria-haspopup="dialog"
          aria-label="Open profile menu"
        >
          {initial}
        </button>
      </div>

      {/* Profile dropdown – matches reference: avatar, role, timezone, currency, actions, balances, logout */}
      {profileMenuOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Profile menu"
          className="absolute right-3 top-full z-50 mt-2 w-[min(calc(100vw-1.5rem),20rem)] rounded-xl border border-zinc-200 bg-white shadow-lg sm:right-4"
        >
          <div className="relative px-4 pb-4 pt-3">
            <button
              type="button"
              onClick={() => setProfileMenuOpen(false)}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-sm bg-zinc-100 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
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
                onClick={() => setProfileMenuOpen(false)}
                className="flex flex-1 items-center justify-center rounded-sm bg-blue-600 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                My Profile
              </Link>
              <Link
                href="/reports/account-statement"
                onClick={() => setProfileMenuOpen(false)}
                className="flex flex-1 items-center justify-center rounded-sm bg-blue-600 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                A/c Statement
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-sm bg-zinc-100 px-3 py-3">
              {[
                { key: "balance", label: "Balance", value: balances.balance },
                { key: "balanceDown", label: "Balance down", value: balances.balanceDown },
                { key: "netExposure", label: "Net Exposure", value: balances.netExposure },
                { key: "creditLimit", label: "Credit limit", value: balances.creditLimit },
                { key: "availableCredit", label: "Avilable credit", value: balances.availableCredit },
              ]
                .filter((x) => shouldShowBalanceField(x.value))
                .map((it) => (
                  <div key={it.key} className="flex flex-col items-center text-center">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                      {it.label}
                    </span>
                    <span className="mt-1 text-sm font-bold tabular-nums text-zinc-900">
                      {it.value}
                    </span>
                  </div>
                ))}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm bg-red-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
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
