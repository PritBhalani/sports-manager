"use client";

import { useEffect } from "react";
import { clearAuthSessionCookie } from "@/hooks/useAuth";
import { clearAuth } from "@/store/authStore";

export default function LogoutPage() {
  useEffect(() => {
    clearAuth();
    clearAuthSessionCookie();
    window.location.replace("/login");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2">
      <p className="text-sm text-muted">Signing out...</p>
    </div>
  );
}
