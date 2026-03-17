/**
 * Base API client. Uses apiConfig.baseUrl (NEXT_PUBLIC_API_BASE).
 * Authenticated requests send: Primary-Token, Token, Content-Decoding (IMEI) per README.
 */
import { apiConfig } from "@/config/api.config";
import { getAuthTokens } from "@/store/authStore";

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

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${apiConfig.baseUrl}${fullPath(path)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${apiConfig.baseUrl}${fullPath(path)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}
