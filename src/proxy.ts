/**
 * Next.js 16: route protection (replaces middleware.ts).
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
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) return NextResponse.next();

  if (apiConfig.useMock) return NextResponse.next();

  const cookieName = apiConfig.authCookieName;
  const hasSession = request.cookies.has(cookieName) && request.cookies.get(cookieName)?.value;

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
  ],
};
