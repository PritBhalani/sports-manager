import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BarChart3,
  PiggyBank,
  Users,
  UserCog,
  TrendingUp,
  Dice5,
  Gift,
  Share2,
  FileSearch,
  Shield,
  Wallet,
  ListOrdered,
  ImageIcon,
  Building2,
  ArrowDownToLine,
  Coins,
  Bell,
  FolderCog,
} from "lucide-react";

export type CommandPaletteRoute = {
  id: string;
  href: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  /** Extra strings to match when searching */
  keywords?: string[];
};

/** Default + common pages — searchable from header command palette */
export const COMMAND_PALETTE_ROUTES: CommandPaletteRoute[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    title: "Dashboard",
    description: "Get full information about current system status",
    Icon: LayoutDashboard,
    keywords: ["home", "main"],
  },
  {
    id: "dashboard-charts",
    href: "/dashboard/analytics",
    title: "Dashboard: Charts",
    description: "View charts of current system status",
    Icon: BarChart3,
    keywords: ["analytics", "stats"],
  },
  {
    id: "dashboard-deposit-charts",
    href: "/accounts/deposit/history",
    title: "Dashboard: Deposit Charts",
    description: "View deposit charts and deposit history",
    Icon: PiggyBank,
    keywords: ["deposit", "history"],
  },
  {
    id: "players",
    href: "/players",
    title: "Players",
    description: "View all players",
    Icon: Users,
    keywords: ["users", "downline"],
  },
  {
    id: "admins",
    href: "/admins",
    title: "Admins",
    description: "View all admins",
    Icon: UserCog,
    keywords: ["administrators"],
  },
  {
    id: "bonus-root",
    href: "/reports/account-statement",
    title: "Bonus",
    description: "Account statement and bonus-related reports",
    Icon: Gift,
    keywords: ["statement", "account"],
  },
  {
    id: "transactions-request",
    href: "/accounts/requests/deposit",
    title: "Transactions: Request",
    description: "Deposit requests",
    Icon: Wallet,
  },
  {
    id: "transactions-auto",
    href: "/accounts/deposit",
    title: "Transactions: Auto",
    description: "Auto deposit",
    Icon: ArrowDownToLine,
  },
  {
    id: "transactions-manual",
    href: "/accounts/withdraw",
    title: "Transactions: Manual",
    description: "Manual withdraw",
    Icon: Wallet,
  },
  {
    id: "sports-betlist",
    href: "/bets/history",
    title: "Sports: Betlist",
    description: "Bet history and list",
    Icon: ListOrdered,
    keywords: ["bets", "history"],
  },
  {
    id: "sports-spm",
    href: "/bets/markets",
    title: "Sports: SPM Sports",
    description: "Sports markets",
    Icon: TrendingUp,
  },
  {
    id: "casino-stats",
    href: "/security/analytics",
    title: "Casino: Stats",
    description: "Casino analytics",
    Icon: BarChart3,
  },
  {
    id: "casino-games",
    href: "/markets/manage",
    title: "Casino: Games",
    description: "Manage markets / games",
    Icon: Dice5,
  },
  {
    id: "bonus-statement",
    href: "/reports/credit-statement",
    title: "Bonus: Statement",
    description: "Credit statement",
    Icon: FileSearch,
  },
  {
    id: "bonus-claims",
    href: "/reports/downline-summary",
    title: "Bonus: Claims",
    description: "Downline summary",
    Icon: Share2,
  },
  {
    id: "referrals",
    href: "/settings/referral",
    title: "Referrals",
    description: "Referral settings",
    Icon: Share2,
  },
  {
    id: "website-analytics",
    href: "/dashboard/analytics",
    title: "Website: Analytics",
    description: "Site analytics",
    Icon: BarChart3,
  },
  {
    id: "website-banners",
    href: "/website/banners",
    title: "Website: Banners",
    description: "Manage banners",
    Icon: ImageIcon,
  },
  {
    id: "website-banking",
    href: "/website/banking",
    title: "Website: Banking",
    description: "Account history / banking",
    Icon: Building2,
  },
  {
    id: "website-gateways",
    href: "/accounts/deposit",
    title: "Website: Gateways",
    description: "Deposit gateways",
    Icon: Coins,
  },
  {
    id: "website-currency",
    href: "/accounts/balance",
    title: "Website: Currency",
    description: "Balance and currency",
    Icon: Coins,
  },
  {
    id: "website-forms",
    href: "/settings/notifications",
    title: "Website: Forms",
    description: "Notifications and forms",
    Icon: Bell,
  },
  {
    id: "website-external",
    href: "/settings/event-types",
    title: "Website: External Integrations",
    description: "Event types and integrations",
    Icon: FolderCog,
  },
  {
    id: "website-data",
    href: "/settings/event-types",
    title: "Website: Data Integrations",
    description: "Data integrations",
    Icon: FolderCog,
  },
  {
    id: "reports",
    href: "/reports/profit-loss",
    title: "Reports",
    description: "Profit & loss and reports",
    Icon: FileSearch,
  },
  {
    id: "reports-account",
    href: "/reports/account-statement",
    title: "Reports: Account Statement",
    description: "Account statement",
    Icon: FileSearch,
  },
  {
    id: "security-groups",
    href: "/security/login-history",
    title: "Security: User Groups",
    description: "Login history",
    Icon: Shield,
  },
  {
    id: "security-activity",
    href: "/security/activity",
    title: "Security: Activity",
    description: "Activity logs",
    Icon: Shield,
  },
  {
    id: "security-announcement",
    href: "/settings/notifications",
    title: "Security: Announcement",
    description: "Notifications / announcements",
    Icon: Bell,
  },
  {
    id: "profile",
    href: "/profile",
    title: "My Profile",
    description: "Your profile settings",
    Icon: Users,
  },
];

export function filterCommandRoutes(
  query: string,
  routes: CommandPaletteRoute[] = COMMAND_PALETTE_ROUTES,
): CommandPaletteRoute[] {
  const q = query.trim().toLowerCase();
  if (!q) return routes;
  return routes.filter((r) => {
    const hay = [
      r.title,
      r.description,
      r.href,
      ...(r.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q) || q.split(/\s+/).every((word) => hay.includes(word));
  });
}
