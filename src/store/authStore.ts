"use client";

/**
 * Holds authenticated session data from login (README: Primary-Token, Token, Content-Decoding/IMEI).
 * apiClient can read these for authenticated requests.
 */
import type { LoginResponse } from "@/types/auth.types";

const AUTH_STORAGE_KEY = "sm_auth_session";
/** Full `data` from login — same shape as API `data` (token, claims, user, …) */
export const AUTH_LOGIN_PAYLOAD_KEY = "sm_auth_login_payload";
/** Full envelope — success, messages, data, wsMessageType */
export const AUTH_LOGIN_ENVELOPE_KEY = "sm_auth_login_envelope";

export type AuthSession = {
  primaryToken?: string;
  token?: string;
  imei?: string;
  userId?: string;
  claims?: string[];
  user?: LoginResponse["user"];
  currency?: LoginResponse["currency"];
  parent?: LoginResponse["parent"];
  ipAddress?: string;
  /**
   * Exact `data` object from POST /authenticate/login (token, claims, user with
   * betConfigs/stakeConfigs/commissions, currency, parent, ipAddress).
   * Stored inside sm_auth_session and mirrored to sm_auth_login_payload for easy inspection.
   */
  loginData?: Record<string, unknown>;
};

let session: AuthSession = {};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function readSessionFromStorage(): AuthSession {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionToStorage(next: AuthSession): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore storage failures */
  }
}

function clearSessionStorage(): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_LOGIN_PAYLOAD_KEY);
    window.localStorage.removeItem(AUTH_LOGIN_ENVELOPE_KEY);
  } catch {
    /* ignore storage failures */
  }
}

export function getAuthSession(): AuthSession {
  if (
    !session.primaryToken &&
    !session.token &&
    !session.imei &&
    canUseStorage()
  ) {
    session = readSessionFromStorage();
  }

  return { ...session };
}

export function getAuthTokens(): Pick<AuthSession, "primaryToken" | "token" | "imei"> {
  const current = getAuthSession();
  return {
    primaryToken: current.primaryToken,
    token: current.token,
    imei: current.imei,
  };
}

export function setAuthSession(next: AuthSession): void {
  session = { ...next };
  writeSessionToStorage(session);
}

export function setAuthTokens(
  next: Pick<AuthSession, "primaryToken" | "token" | "imei">,
): void {
  setAuthSession({ ...getAuthSession(), ...next });
}

export function clearAuth(): void {
  session = {};
  clearSessionStorage();
}
