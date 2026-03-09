"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { LayoutProps } from "@/types/layout.types";
import { LAYOUT_BREAKPOINT_MD } from "@/utils/constants";

export default function DashboardLayout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= LAYOUT_BREAKPOINT_MD) {
      setSidebarOpen(true);
    }
  }, []);

  const closeSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < LAYOUT_BREAKPOINT_MD) {
      setSidebarOpen(false);
    }
  };
  const toggleSidebar = () => setSidebarOpen((o) => !o);

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
        <Navbar onMenuClick={toggleSidebar} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-zinc-100 p-4 sm:p-5 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
