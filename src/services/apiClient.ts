/**
 * Base API client. Uses apiConfig.baseUrl (NEXT_PUBLIC_API_BASE).
 * Authenticated requests send: Primary-Token, Token, Content-Decoding (IMEI) per README.
 * 401 responses trigger logout + redirect to /login (session expired).
 */
import { apiConfig } from "@/config/api.config";
import { getAuthTokens } from "@/store/authStore";
import { handleUnauthorizedSession } from "@/utils/sessionExpiry";

function authHeaders(): Record<string, string> {
  const t = getAuthTokens();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t.primaryToken) h["Primary-Token"] = t.primaryToken;
  if (t.token) h["Token"] = t.token;
  if (t.imei) h["Content-Decoding"] = t.imei;
  return h;
}

function fullPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function handleUnauthorizedIfNeeded(path: string, status: number): void {
  if (status !== 401) return;
  if (typeof window === "undefined") return;

  const lower = path.toLowerCase();
  if (
    lower.includes("/authenticate/login") ||
    lower.includes("/authenticate/captcha")
  ) {
    return;
  }

  handleUnauthorizedSession();
}

async function parseJsonResponse<T>(
  path: string,
  res: Response,
): Promise<T> {
  if (!res.ok && res.status === 401) {
    handleUnauthorizedIfNeeded(path, res.status);
    throw new Error("Session expired. Redirecting to login.");
  }
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${apiConfig.baseUrl}${fullPath(path)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
    credentials: "include",
  });
  return parseJsonResponse<T>(path, res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${apiConfig.baseUrl}${fullPath(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(path, res);
}
