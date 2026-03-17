"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  User,
  Wallet,
  TrendingUp,
  Store,
  Users,
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

/** Sidebar menu matching BharatPlays layout, using only existing pages */
const menuConfig: MenuItem[] = [
  // Dashboard
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },

  // Transactions
  {
    label: "Transactions",
    icon: Wallet,
    children: [
      { href: "/accounts/requests/deposit", label: "Request" },
      { href: "/accounts/deposit", label: "Auto" },
      { href: "/accounts/withdraw", label: "Manual" },
    ],
  },

  // Players
  { href: "/players", label: "Players", icon: Users },

  // Admins
  { href: "/admins", label: "Admins", icon: Users },

  // Sports
  {
    label: "Sports",
    icon: TrendingUp,
    children: [
      { href: "/bets/history", label: "Betlist" },
      { href: "/bets/markets", label: "SPM Sports" },
    ],
  },

  // Website
  {
    label: "Website",
    icon: Store,
    children: [{ href: "/website/banners", label: "Banners" }],
  },

  // Reports
  {
    label: "Reports",
    icon: Store,
    children: [
      { href: "/reports/account-statement", label: "Account Statement" },
      { href: "/reports/credit-statement", label: "Credit Statement" },
      { href: "/reports/profit-loss", label: "P&L Statement" },
      { href: "/reports/bet-history", label: "Bet History" },
      {
        href: "/reports/bet-history-by-market",
        label: "Bet History by Market",
      },
      { href: "/reports/pl-by-market", label: "P&L by Market" },
      {
        href: "/reports/pl-by-market-details",
        label: "P&L by Market Details",
      },
      { href: "/reports/pl-by-agent", label: "P&L by Agent" },
      { href: "/reports/downline-summary", label: "Downline Summary" },
      { href: "/reports/analytics", label: "Reports Analytics" },
    ],
  },

  // Security
  {
    label: "Security",
    icon: Shield,
    children: [
      { href: "/security/login-history", label: "Activity" },
      { href: "/security/token-history", label: "Fraud Logs" },
    ],
  },

  // Settings
  {
    label: "Settings",
    icon: Settings,
    children: [
      { href: "/settings/notifications", label: "Notifications" },
      { href: "/settings/event-types", label: "Event Types" },
      { href: "/settings/referral", label: "Referral" },
    ],
  },

  // My Profile
  { href: "/profile", label: "My Profile", icon: User },
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

  // Ensure the dropdown for the current route is open (e.g. on hard refresh
  // or when navigating directly to a deep link).
  useEffect(() => {
    setOpenDropdowns((prev) => {
      const next = new Set(prev);
      menuConfig.forEach((item) => {
        if ("children" in item && item.children?.length) {
          const shouldBeOpen = hasActiveChild(pathname, item.children);
          if (shouldBeOpen) next.add(item.label);
        }
      });
      return next;
    });
  }, [pathname]);

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
                              className={`block rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-zinc-800 hover:text-white ${
                                childActive
                                  ? "bg-zinc-800/80 text-white ring-1 ring-zinc-600"
                                  : "text-zinc-400"
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
