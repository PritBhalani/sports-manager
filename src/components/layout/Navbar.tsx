"use client";

import { Search, Menu, Calendar } from "lucide-react";

type NavbarProps = {
  onMenuClick?: () => void;
  cashBalance?: string;
  coins?: string;
  userInitial?: string;
};

export default function Navbar({
  onMenuClick,
  cashBalance = "143,540.06",
  coins = "226",
  userInitial = "B",
}: NavbarProps) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 sm:gap-4 sm:px-4 md:h-16">
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

      {/* Right: balance (hidden on xs), coins, profile */}
      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden items-center gap-4 sm:flex md:gap-6">
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Cash
            </p>
            <p className="text-sm font-semibold tabular-nums text-zinc-900">
              {cashBalance}
            </p>
          </div>
          <div className="h-8 w-px bg-zinc-200" />
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Coins
            </p>
            <p className="text-sm font-semibold tabular-nums text-zinc-900">
              {coins}
            </p>
          </div>
        </div>
        {/* Compact balance on very small screens */}
        <div className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2 py-1.5 text-zinc-700 sm:hidden">
          <span className="text-xs font-medium tabular-nums">{cashBalance}</span>
        </div>
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 sm:h-9 sm:w-9 sm:text-sm"
          aria-hidden
        >
          {userInitial}
        </div>
      </div>
    </header>
  );
}
