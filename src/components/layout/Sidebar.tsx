"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, LogOut } from "lucide-react";
import type { ComponentType } from "react";
import {
  IconAuto,
  IconBarChart3,
  IconBanknote,
  IconClipboardCheck,
  IconBetlist,
  IconCasino,
  IconCurrency,
  IconGateways,
  IconAnnouncement,
  IconReports,
  IconReferrals,
  IconSecurity,
  IconWebsite,
  IconLosingCommission,
  IconGGR,
  IconBlockedPlayers,
  IconBlockedPlayerHistory,
  IconDemoPlayers,
  IconNthDeposit,
  IconFTD,
  IconZeroDepositPlayers,
  IconSettings,
  IconWallets,
  IconMyProfile,
  IconFlags,
  IconPlayerMaster,
  IconInactivePlayers,
  IconRoles,
  IconActivity as IconDashboardActivity,
  IconFraudLogs,
  IconDashboard,
  IconFileCheck2,
  IconFileText,
  IconDatabase,
  IconGamepad2,
  IconGift,
  IconImageIcon,
  IconGlobe,
  IconManual,
  IconFlag,
  IconLink2,
  IconPlayer,
  IconTrophy,
  IconRequest,
  IconTransaction,
  IconUsers,
} from "@/components/layout/SidebarSvgIcons";

type MenuLink = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: "beta";
  children?: never;
};

type MenuDropdown = {
  href?: never;
  label: string;
  icon: ComponentType<{ className?: string }>;
  children: {
    href: string;
    label: string;
    badge?: "beta";
    icon?: ComponentType<{ className?: string }>;
  }[];
};

type MenuItem = MenuLink | MenuDropdown;

const menuConfig: MenuItem[] = [
  // Dashboard
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },

  // Transactions
  {
    label: "Transactions",
    icon: IconTransaction,
    children: [
      { href: "/transactions/requests", label: "Request", icon: IconRequest },
      { href: "/accounts/deposit", label: "Auto", icon: IconAuto },
      { href: "/accounts/withdraw", label: "Manual", icon: IconManual },
    ],
  },

  // Players
  { href: "/players", label: "Players", icon: IconPlayer },

  // Sports
  {
    label: "Sports",
    icon: IconTrophy,
    children: [
      { href: "/sports/betlist", label: "Betlist", badge: "beta", icon: IconBetlist },
      { href: "/sports/spm-sports", label: "SPM Sports", icon: IconTrophy },
      { href: "/sports/betfair", label: "Betfair", icon: IconGamepad2 },
      { href: "/sports/betby", label: "Betby", icon: IconLink2 },
      { href: "/sports/atlas", label: "Atlas", icon: IconGlobe },
      { href: "/sports/ig-pixel", label: "IG Pixel", icon: IconFlag },
      { href: "/sports/alt-gaming", label: "Alt Gaming", icon: IconGamepad2 },
    ],
  },

  // Casino
  {
    label: "Casino",
    icon: IconCasino,
    children: [
      { href: "/casino/stats", label: "Stats", badge: "beta", icon: IconBarChart3 },
      { href: "/casino/bet-list", label: "Bet List", icon: IconBetlist },
      { href: "/casino/games", label: "Games", icon: IconGamepad2 },
    ],
  },

  // Bonus
  {
    label: "Bonus",
    icon: IconGift,
    children: [
      { href: "/bonus/bonus", label: "Bonus", icon: IconGift },
      { href: "/bonus/claims", label: "Claims", icon: IconClipboardCheck },
      { href: "/bonus/statment", label: "Statment", icon: IconFileText },
    ],
  },

  // Referrals (link)
  { href: "/referrals", label: "Referrals", icon: IconReferrals },

  // Website
  {
    label: "Website",
    icon: IconWebsite,
    children: [
      { href: "/website/analytics", label: "Analytics", icon: IconBarChart3 },
      { href: "/website/banners", label: "Banners", icon: IconImageIcon },
      { href: "/website/banking", label: "Banking", icon: IconBanknote },
      { href: "/website/gatways", label: "Gateways", icon: IconGateways },
      { href: "/website/currency", label: "Currency", icon: IconCurrency },
      { href: "/website/forms", label: "Forms", badge: "beta", icon: IconFileCheck2 },
      {
        href: "/website/external-integrations",
        label: "External Integrations",
        icon: IconGateways,
      },
      {
        href: "/website/data-integrations",
        label: "Data Integrations",
        icon: IconDatabase,
      },
    ],
  },

  // Reports (/reports/* list pages + player report shortcuts)
  {
    label: "Reports",
    icon: IconReports,
    children: [
      // { href: "/reports/profit-loss", label: "Profit & Loss", icon: IconReports },
      // { href: "/reports/analytics", label: "Reports Analytics", icon: IconBarChart3 },
      // { href: "/reports/account-statement", label: "Account Statement", icon: IconFileText },
      // { href: "/reports/credit-statement", label: "Credit Statement", icon: IconFileText },
      { href: "/reports/downline-summary", label: "Agent P&L Summary", icon: IconClipboardCheck },
      { href: "/reports/b2c-summary", label: "B2C Summary", icon: IconUsers },
      { href: "/reports/b2c-activity", label: "B2C Activity", icon: IconUsers },
      { href: "/reports/fd-game-report", label: "FD Game Report", icon: IconReports },
      // { href: "/reports/bet-history", label: "Bet History", icon: IconBetlist },
      // { href: "/reports/bet-history-by-market", label: "Bet History by Market", icon: IconBetlist },
      { href: "/reports/pl-by-agent", label: "P&L by Agent", icon: IconReports },
      { href: "/reports/pl-by-market", label: "P&L by Market", icon: IconReports },
      // { href: "/reports/pl-by-market-details", label: "P&L Market Details", icon: IconReports },
      // { href: "/players/detail", label: "Losing Commission", icon: IconLosingCommission },
      // { href: "/dashboard/analytics", label: "GGR", icon: IconGGR },
      // { href: "/players/blocked", label: "Blocked Players", icon: IconBlockedPlayers },
      // {
      //   href: "/players/blocked-history",
      //   label: "Blocked Player History",
      //   icon: IconBlockedPlayerHistory,
      // },
      // { href: "/players/demo", label: "Demo Players", icon: IconDemoPlayers },
      // { href: "/players/nth-deposit", label: "Nth Deposit", icon: IconNthDeposit },
      // { href: "/players/ftd", label: "FTD", icon: IconFTD },
      // {
      //   href: "/players/zero-deposit",
      //   label: "Zero Deposit Players",
      //   icon: IconZeroDepositPlayers,
      // },
      // { href: "/players/inactive", label: "Inactive Players", icon: IconInactivePlayers },
      // { href: "/players/master", label: "Player Master", badge: "beta", icon: IconPlayerMaster },
    ],
  },

  // Security
  {
    label: "Security",
    icon: IconSecurity,
    children: [
      { href: "/security/token-history", label: "Roles", icon: IconRoles },
      { href: "/security/activity", label: "Activity", icon: IconDashboardActivity },
      { href: "/security/token-history", label: "Fraud Logs", icon: IconFraudLogs },
    ],
  },

  // User Groups + Flags
  // {
  //   label: "User Groups",
  //   icon: IconUsers,
  //   children: [
  //     { href: "/security/login-history", label: "User Groups", icon: IconUsers },
  //     { href: "/players/blocked-history", label: "Flags", icon: IconFlags },
  //   ],
  // },

  // Settings / wallets / profile
  {
    label: "Settings",
    icon: IconSettings,
    children: [
      { href: "/settings", label: "Settings", icon: IconSettings },
      { href: "/settings/notifications", label: "Notifications", icon: IconAnnouncement },
    ],
  },
  { href: "/wallets", label: "Wallets", icon: IconWallets, badge: "beta" },
  { href: "/profile", label: "My Profile", icon: IconMyProfile },
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
      className="fixed left-0 top-0 z-40 flex h-screen w-[15rem] max-w-[85vw] flex-col bg-sidebar-bg text-sidebar-text shadow-xl transition-[transform] duration-200 md:shadow-none md:transition-[margin] md:duration-200"
      style={{
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        marginLeft: 0,
      }}
    >
      {/* Top section: Logo */}
      <div className="flex flex-shrink-0 items-center border-b border-sidebar-border px-5 py-4">
        <span className="text-lg font-bold tracking-wider text-white">
          Sports Manager
        </span>
      </div>

      {/* Middle section: Scrollable navigation */}
      <nav
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-ring [&::-webkit-scrollbar-thumb]:hover:bg-sidebar-muted"
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
                    className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-hover hover:text-white ${
                      active ? "bg-sidebar-active text-white" : ""
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                    {item.badge === "beta" && (
                      <span className="rounded-full bg-warning/90 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                        beta
                      </span>
                    )}
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
                    className={`flex w-full items-center justify-between rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-sidebar-hover hover:text-white ${
                      activeChild ? "bg-sidebar-active text-white" : ""
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {isOpenDropdown ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isOpenDropdown && (
                    <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-ring pl-3">
                      {children.map((child) => {
                        const childActive = pathname.startsWith(child.href);
                        const ChildIcon = child.icon;
                        return (
                          <li
                            key={`${item.label}:${child.label}:${child.href}`}
                          >
                            <Link
                              href={child.href}
                              onClick={onClose}
                              className={`block rounded-sm px-2.5 py-2 text-sm transition-colors hover:bg-sidebar-hover hover:text-white ${
                                childActive
                                  ? "bg-sidebar-hover/80 text-white ring-1 ring-sidebar-ring"
                                  : "text-sidebar-muted"
                              }`}
                            >
                            <div className="flex items-center gap-2">
                        {ChildIcon ? (
                          <ChildIcon className="h-4 w-4 flex-shrink-0" />
                        ) : null}
                              <span>{child.label}</span>
                              {child.badge === "beta" && (
                                <span className="rounded-full bg-warning/90 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                                  beta
                                </span>
                              )}
                            </div>
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
      <div className="mt-auto flex flex-shrink-0 border-t border-sidebar-border p-3">
        <Link
          href="/logout"
          onClick={onClose}
          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-sidebar-text transition-colors hover:bg-sidebar-hover hover:text-white"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span>Log Out</span>
        </Link>
      </div>
    </aside>
  );
}
