"use client";

/**
 * Holds session tokens from login (README: Primary-Token, Token, Content-Decoding/IMEI).
 * apiClient can read these for authenticated requests.
 */
export type AuthTokens = {
  primaryToken?: string;
  token?: string;
  imei?: string;
};

let tokens: AuthTokens = {};

export function getAuthTokens(): AuthTokens {
  return { ...tokens };
}

export function setAuthTokens(next: AuthTokens): void {
  tokens = { ...next };
}

export function clearAuth(): void {
  tokens = {};
}
