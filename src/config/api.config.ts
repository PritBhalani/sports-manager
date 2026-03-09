/**
 * API and app config. Prefer env vars in production.
 * When baseUrl is not set, app runs in UI-only mode (mocks) so it does not break.
 */
const env = typeof process !== "undefined" ? process.env : undefined;

const baseUrl =
  (env?.NEXT_PUBLIC_API_BASE as string) ||
  (typeof window !== "undefined" ? "" : "http://localhost:3000");

export const apiConfig = {
  /** Base URL for REST API (README: BASE_URL_REST). Empty = UI-only mode with mocks. */
  baseUrl,

  /** When true, apiClient returns mocks instead of calling the API (no base URL or explicit override). */
  useMock: !baseUrl || (env?.NEXT_PUBLIC_USE_MOCK === "true"),

  /** Cookie name used by proxy to detect logged-in session */
  authCookieName: "sm_session",

  /** Cookie max age in seconds (1 day) */
  authCookieMaxAge: 86400,
} as const;

export default apiConfig;
