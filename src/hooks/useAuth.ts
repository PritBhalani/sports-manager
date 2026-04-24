"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthTokens, clearAuth } from "@/store/authStore";
import { apiConfig } from "@/config/api.config";

function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${apiConfig.authCookieName}=; path=/; max-age=0`;
}

function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${apiConfig.authCookieName}=1; path=/; max-age=${apiConfig.authCookieMaxAge}`;
}

/** Set session cookie (call after successful login). */
export function setAuthSessionCookie(): void {
  setSessionCookie();
}

/** Clear session cookie (call on logout). */
export function clearAuthSessionCookie(): void {
  clearSessionCookie();
}

/**
 * Auth state and helpers. Use in dashboard layout or pages.
 * - isAuthenticated: true if we have at least one token in memory
 * - logout: clears store, clears cookie, redirects to /login
 */
export function useAuth() {
  const router = useRouter();
  const tokens = getAuthTokens();
  const isAuthenticated =
    Boolean(tokens.primaryToken || tokens.token) || Boolean(tokens.imei);

  const logout = useCallback(() => {
    clearAuth();
    clearSessionCookie();
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    } else {
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  return { isAuthenticated, tokens, logout };
}
