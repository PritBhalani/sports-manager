/**
 * README §1 Authentication
 * GET /authenticate/captcha, POST /authenticate/login (Basic Auth: username, password)
 * When apiConfig.useMock, returns dummy captcha and login throws so UI does not break.
 */
import { apiConfig } from "@/config/api.config";
import type { CaptchaResponse, LoginBody, LoginResponse } from "@/types/auth.types";

const AUTH = "/authenticate";

const MOCK_CAPTCHA: CaptchaResponse = {
  key: "mock",
  image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40'%3E%3Crect fill='%23f0f0f0' width='120' height='40'/%3E%3Ctext x='60' y='25' text-anchor='middle' fill='%23999' font-size='12'%3EMock%3C/text%3E%3C/svg%3E",
};

/** GET /authenticate/captcha — no auth. Returns captcha payload (key/image). In UI-only mode returns mock. */
export async function getCaptcha(): Promise<CaptchaResponse> {
  if (apiConfig.useMock) return Promise.resolve(MOCK_CAPTCHA);
  const url = `${apiConfig.baseUrl}${AUTH}/captcha`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Captcha error ${res.status}: ${res.statusText}`);
  return res.json() as Promise<CaptchaResponse>;
}

/**
 * POST /authenticate/login
 * Auth: Basic (username, password). Body: key, captcha, IMEI, device, mode, mobile, username, password.
 * In UI-only mode throws so user sees "Set NEXT_PUBLIC_API_BASE to connect to the API."
 */
export async function login(
  username: string,
  password: string,
  body: Omit<LoginBody, "username" | "password">
): Promise<LoginResponse> {
  if (apiConfig.useMock) {
    return Promise.resolve({
      PrimaryToken: "mock-primary-token",
      Token: "mock-token",
      IMEI: "mock-imei",
    } as LoginResponse);
  }
  const url = `${apiConfig.baseUrl}${AUTH}/login`;
  const basic = btoa(`${username}:${password}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
    },
    credentials: "include",
    body: JSON.stringify({
      ...body,
      username,
      password,
    } as LoginBody),
  });
  if (!res.ok) throw new Error(`Login failed ${res.status}: ${res.statusText}`);
  return res.json() as Promise<LoginResponse>;
}
