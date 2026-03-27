"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSessionCookie } from "@/hooks/useAuth";
import { clearAuth } from "@/store/authStore";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    clearAuth();
    clearAuthSessionCookie();
    router.replace("/login");
    router.refresh();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2">
      <p className="text-sm text-muted">Signing out…</p>
    </div>
  );
}
