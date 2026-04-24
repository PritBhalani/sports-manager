/**
 * Cloudflare-compatible route protection middleware.
 * Redirects to /login when session cookie is missing on protected paths.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiConfig } from "@/config/api.config";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/accounts",
  "/bets",
  "/markets",
  "/players",
  "/position",
  "/reports",
  "/security",
  "/profile",
  "/settings",
  "/website",
  "/wallets",
  "/transactions",
  "/sports",
  "/referrals",
  "/casino",
  "/bonus",
  "/agent-report",
];

const AUTH_COOKIE_NAME = apiConfig.authCookieName;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  const hasSession = request.cookies.has(AUTH_COOKIE_NAME);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounts/:path*",
    "/bets/:path*",
    "/markets/:path*",
    "/players/:path*",
    "/position/:path*",
    "/reports/:path*",
    "/security/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/website/:path*",
    "/wallets/:path*",
    "/transactions/:path*",
    "/sports/:path*",
    "/referrals/:path*",
    "/casino/:path*",
    "/bonus/:path*",
    "/agent-report/:path*",
  ],
};
