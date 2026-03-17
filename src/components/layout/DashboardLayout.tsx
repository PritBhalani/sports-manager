"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { LayoutProps } from "@/types/layout.types";
import { LAYOUT_BREAKPOINT_MD } from "@/utils/constants";
import { getBalance } from "@/services/account.service";
import { formatCurrency } from "@/utils/formatCurrency";

function formatCoins(value: unknown): string {
  if (value === undefined || value === null) return "0";
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function DashboardLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cashBalance, setCashBalance] = useState<string | undefined>();
  const [coins, setCoins] = useState<string | undefined>();
  const [showNotice, setShowNotice] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= LAYOUT_BREAKPOINT_MD) {
      setSidebarOpen(true);
    }
  }, []);

  // README §2 GET /account/getbalance — balance for authenticated user
  useEffect(() => {
    let cancelled = false;
    getBalance()
      .then((res) => {
        if (cancelled || !res) return;
        const cash = res.cash ?? res.balance ?? res.chips;
        if (cash !== undefined && cash !== null) {
          setCashBalance(formatCurrency(cash));
        }
        if (res.coins !== undefined && res.coins !== null) {
          setCoins(formatCoins(res.coins));
        }
      })
      .catch(() => {
        /* keep Navbar defaults if balance fails */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const closeSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < LAYOUT_BREAKPOINT_MD) {
      setSidebarOpen(false);
    }
  };
  const toggleSidebar = () => setSidebarOpen((o) => !o);

  // Do not pass userInitial from render: getAuthSession() differs SSR vs client
  // and causes hydration mismatch in Navbar avatar. Navbar resolves initial after mount.

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Backdrop on mobile when sidebar is open */}
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
        className={`flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ${sidebarOpen ? "md:ml-[260px]" : ""}`}
      >
        {showNotice && (
          <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-xs text-amber-900 sm:px-5 sm:py-2.5 md:px-6">
            <span className="inline-flex h-6 items-center rounded-full bg-amber-200 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-900">
              Notice
            </span>
            <p className="flex-1 truncate text-[11px] sm:text-xs">
              Ezugi Maintenance Notice: Live Table Services will undergo scheduled maintenance as per the details below: Date: 11 Mar 2026 (Wednesday) 10:30 AM – 1:30 PM India Standard Time (IST).
            </p>
            <button
              type="button"
              className="ml-2 text-[11px] font-medium text-amber-900/80 underline-offset-2 hover:underline"
              onClick={() => setShowNotice(false)}
            >
              Dismiss
            </button>
          </div>
        )}
        <Navbar
          onMenuClick={toggleSidebar}
          cashBalance={cashBalance}
          coins={coins}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-zinc-100 p-4 sm:p-5 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
