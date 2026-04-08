"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { LayoutProps } from "@/types/layout.types";
import { LAYOUT_BREAKPOINT_MD } from "@/utils/constants";
import {
  getBalance,
  getBalanceDetail,
  getPendingPayInOutCount,
} from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";
import type { BalanceResponse } from "@/types/account.types";
import { useAuth } from "@/hooks/useAuth";
import { getAuthSession } from "@/store/authStore";
import {
  NotificationBannerProvider,
  useNotificationBanner,
} from "@/context/NotificationBannerContext";
import { ScrollJumpButton } from "@/components/layout/ScrollJumpButton";

/** Navbar strip — same GET /account/getbalance as dashboard / balance page */
function mapBalanceToNavbar(res: BalanceResponse | null | undefined) {
  if (!res || typeof res !== "object") {
    return {
      balance: "—",
      balanceDown: "—",
      netExposure: "—",
      creditLimit: "—",
      availableCredit: "—",
    };
  }
  const bal =
    res.balance ??
    res.cash ??
    res.chips ??
    res.balanceUp ??
    0;
  const down = res.balanceDown ?? res.give ?? 0;
  const netExposure =
    res.exposure ?? (res as BalanceResponse & { netExposure?: number }).netExposure ?? 0;
  const limit = res.creditLimit ?? 0;
  const avail = res.availableCredit ?? 0;
  return {
    balance: formatCurrency(bal),
    balanceDown: formatCurrency(down),
    netExposure: formatCurrency(netExposure),
    creditLimit: formatCurrency(limit),
    availableCredit: formatCurrency(avail),
  };
}

function DashboardLayoutInner({ children }: LayoutProps) {
  const { isAuthenticated } = useAuth();
  const banner = useNotificationBanner();
  const mainScrollRef = useRef<HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navbarBalances, setNavbarBalances] = useState(() =>
    mapBalanceToNavbar(undefined),
  );
  const [pendingCounts, setPendingCounts] = useState({ payInCount: 0, payOutCount: 0 });

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= LAYOUT_BREAKPOINT_MD) {
      setSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const userId = String(getAuthSession()?.userId ?? "").trim();
    const POLL_MS = 20_000;

    const tick = async () => {
      const [balanceResult, pendingResult] = await Promise.allSettled([
        userId ? getBalanceDetail(userId) : getBalance(),
        getPendingPayInOutCount(),
      ]);
      if (cancelled) return;

      if (balanceResult.status === "fulfilled") {
        setNavbarBalances(mapBalanceToNavbar(balanceResult.value));
      }
      if (pendingResult.status === "fulfilled") {
        setPendingCounts({
          payInCount: Number(pendingResult.value?.payInCount ?? 0) || 0,
          payOutCount: Number(pendingResult.value?.payOutCount ?? 0) || 0,
        });
      }
    };

    void tick();
    const id = window.setInterval(() => {
      void tick();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAuthenticated]);

  const closeSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < LAYOUT_BREAKPOINT_MD) {
      setSidebarOpen(false);
    }
  };
  const toggleSidebar = () => setSidebarOpen((o) => !o);

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <div
        className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ${sidebarOpen ? "md:ml-[15rem]" : ""}`}
      >
        {banner.text1 && banner.notice1Visible && (
          <div className="flex items-center gap-3 border-b border-warning/40 bg-warning-subtle px-4 py-2 text-xs text-warning-foreground sm:px-5 sm:py-2.5 md:px-6">
            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-warning/25 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning-foreground">
              Notice
            </span>
            <p className="min-w-0 flex-1 text-[11px] leading-relaxed sm:text-xs">{banner.text1}</p>
            <button
              type="button"
              className="ml-2 shrink-0 text-[11px] font-medium text-warning-foreground/80 underline-offset-2 hover:underline"
              onClick={banner.dismissNotice1}
            >
              Dismiss
            </button>
          </div>
        )}
        {banner.text2 && banner.notice2Visible && (
          <div className="flex items-center gap-3 border-b border-warning/40 bg-warning-subtle px-4 py-2 text-xs text-warning-foreground sm:px-5 sm:py-2.5 md:px-6">
            <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-warning/25 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-warning-foreground">
              Notice
            </span>
            <p className="min-w-0 flex-1 text-[11px] leading-relaxed sm:text-xs">{banner.text2}</p>
            <button
              type="button"
              className="ml-2 shrink-0 text-[11px] font-medium text-warning-foreground/80 underline-offset-2 hover:underline"
              onClick={banner.dismissNotice2}
            >
              Dismiss
            </button>
          </div>
        )}
        <Navbar
          onMenuClick={toggleSidebar}
          balances={navbarBalances}
          pendingPayInCount={pendingCounts.payInCount}
          pendingPayOutCount={pendingCounts.payOutCount}
        />
        <main
          ref={mainScrollRef}
          className="dashboard-main-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-surface-2 p-4 sm:p-6 md:p-7"
        >
          {children}
        </main>
        <ScrollJumpButton scrollRef={mainScrollRef} />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: LayoutProps) {
  const { isAuthenticated } = useAuth();
  return (
    <NotificationBannerProvider enabled={isAuthenticated}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </NotificationBannerProvider>
  );
}
