/**
 * When the API returns 401 (session/token expired), clear local session and send the user to login.
 * Uses full navigation so middleware and client state stay in sync.
 */
import { apiConfig } from "@/config/api.config";
import { clearAuth } from "@/store/authStore";

let handlingUnauthorized = false;

function isAuthFlowPathname(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return (
    p === "/login" ||
    p.startsWith("/login/") ||
    p === "/logout" ||
    p.startsWith("/logout/") ||
    p === "/start" ||
    p.startsWith("/start/")
  );
}

export function handleUnauthorizedSession(): void {
  if (typeof window === "undefined") return;

  const pathname = window.location.pathname;
  if (isAuthFlowPathname(pathname)) return;

  if (handlingUnauthorized) return;
  handlingUnauthorized = true;

  clearAuth();
  document.cookie = `${apiConfig.authCookieName}=; path=/; max-age=0`;

  const returnTo = pathname + window.location.search;
  const loginUrl = `/login?next=${encodeURIComponent(returnTo)}`;
  window.location.assign(loginUrl);
}
