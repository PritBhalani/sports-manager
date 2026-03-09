"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  User,
  Wallet,
  TrendingUp,
  Store,
  Users,
  Layers,
  FileBarChart,
  Shield,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

/** Format route segment to display label (e.g. "account-statement" → "Account Statement") */
function segmentToLabel(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

type MenuLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  children?: never;
};

type MenuDropdown = {
  href?: never;
  label: string;
  icon: typeof LayoutDashboard;
  children: { href: string; label: string }[];
};

type MenuItem = MenuLink | MenuDropdown;

/** Sidebar menu derived from app (dashboard) folder structure */
const menuConfig: MenuItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: User },
  {
    label: "Account",
    icon: Wallet,
    children: [
      { href: "/accounts/balance", label: "Balance" },
      { href: "/accounts/deposit", label: "Deposit" },
      { href: "/accounts/withdraw", label: "Withdraw" },
      { href: "/accounts/transfer", label: "Transfer" },
      { href: "/accounts/activity", label: "Activity" },
      // Account statements (README §2 Statements)
      { href: "/reports/account-statement", label: "Account Statement" },
      { href: "/reports/credit-statement", label: "Credit Statement" },
      { href: "/reports/profit-loss", label: "P&L Statement" },
    ],
  },
  {
    label: "Bet",
    icon: TrendingUp,
    children: [
      { href: "/bets/live", label: "Live" },
      { href: "/bets/history", label: "History" },
    ],
  },
  {
    label: "Manage Market",
    icon: Store,
    children: [
      { href: "/markets/manage", label: "Manage" },
      { href: "/markets/lock-status", label: "Lock Status" },
    ],
  },
  {
    label: "User",
    icon: Users,
    children: [
      { href: "/players/add", label: "Add" },
      { href: "/players/inactive", label: "Inactive" },
      { href: "/players/master", label: "Master" },
      { href: "/players/detail", label: "Detail" },
    ],
  },
  {
    label: "Position",
    icon: Layers,
    children: [
      { href: "/position/event", label: "Event" },
      { href: "/position/market", label: "Market" },
    ],
  },
  {
    label: "Bet History",
    icon: FileBarChart,
    children: [
      { href: "/reports/bet-history", label: "Bet History" },
      { href: "/reports/pl-by-market", label: "P&L by Market" },
      { href: "/reports/pl-by-market-details", label: "P&L by Market Details" },
      { href: "/reports/bet-history-by-market", label: "Bet History by Market" },
      { href: "/reports/pl-by-agent", label: "P&L by Agent" },
      { href: "/reports/downline-summary", label: "Downline Summary" },
    ],
  },
  {
    label: "Token / Login History",
    icon: Shield,
    children: [
      { href: "/security/login-history", label: "Login History" },
      { href: "/security/token-history", label: "Token History" },
    ],
  },
  {
    label: "Setting",
    icon: Settings,
    children: [
      { href: "/settings/notifications", label: "Notifications" },
      { href: "/settings/event-types", label: "Event Types" },
      { href: "/settings/referral", label: "Referral" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function hasActiveChild(
  pathname: string,
  children: readonly { href: string }[]
) {
  return children.some((c) => pathname.startsWith(c.href));
}

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const toggleDropdown = (label: string) => {
    setOpenDropdowns((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-[260px] max-w-[85vw] flex-col bg-zinc-900 text-zinc-300 shadow-xl transition-[transform] duration-200 md:shadow-none md:transition-[margin] md:duration-200"
      style={{
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        marginLeft: 0,
      }}
    >
      {/* Top section: Logo */}
      <div className="flex flex-shrink-0 items-center border-b border-zinc-800 px-5 py-4">
        <span className="text-lg font-bold tracking-wider text-white">
          Sports Manager
        </span>
      </div>

      {/* Middle section: Scrollable navigation */}
      <nav
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-thumb]:hover:bg-zinc-500"
        style={{ scrollBehavior: "smooth" }}
      >
        <ul className="flex flex-col gap-0.5 px-3">
          {menuConfig.map((item) => {
            if ("href" in item && item.href) {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-800 hover:text-white ${
                      active ? "bg-zinc-700/90 text-white" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            }

            const children = "children" in item ? item.children : undefined;
            if (children && children.length > 0) {
              const isOpenDropdown = openDropdowns.has(item.label);
              const activeChild = hasActiveChild(pathname, children);
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <button
                    type="button"
                    onClick={() => toggleDropdown(item.label)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-zinc-800 hover:text-white ${
                      activeChild ? "bg-zinc-700/90 text-white" : ""
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{segmentToLabel(item.label)}</span>
                    </span>
                    {isOpenDropdown ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isOpenDropdown && (
                    <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-zinc-700 pl-3">
                      {children.map((child) => {
                        const childActive = pathname.startsWith(child.href);
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onClose}
                              className={`block rounded-lg px-2 py-2 text-sm transition-colors hover:bg-zinc-800 hover:text-white ${
                                childActive ? "text-white" : "text-zinc-400"
                              }`}
                            >
                              {segmentToLabel(child.label)}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            return null;
          })}
        </ul>
      </nav>

      {/* Bottom section: Logout (fixed at bottom) */}
      <div className="mt-auto flex flex-shrink-0 border-t border-zinc-800 p-3">
        <Link
          href="/logout"
          onClick={onClose}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span>Log Out</span>
        </Link>
      </div>
    </aside>
  );
}
