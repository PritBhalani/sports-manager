const env = typeof process !== "undefined" ? process.env : undefined;
const isBrowser = typeof window !== "undefined";

/**
 * Upstream backend base URL.
 *
 * IMPORTANT:
 * - Uses NEXT_PUBLIC_API_BASE when provided.
 * - Falls back to the shared DrPapaya backend for local/client review builds.
 */
const upstreamBaseUrl =
  (env?.NEXT_PUBLIC_API_BASE as string) ||
  "https://5043ee2d3639.igamingpro.app";

/**
 * Browser requests go through the local Next.js proxy to avoid CORS.
 * Server-side requests can talk to the upstream backend directly.
 */
const baseUrl = isBrowser ? "/api/backend" : upstreamBaseUrl;
export const apiConfig = {
  /** Base URL used by frontend services. */
  baseUrl,

  /** Real upstream REST API base URL. */
  upstreamBaseUrl,

  /** Cookie name used by proxy to detect logged-in session */
  authCookieName: "sm_session",

  /** Cookie max age in seconds (1 day) */
  authCookieMaxAge: 86400,
} as const;

export default apiConfig;
