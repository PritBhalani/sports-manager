const env = typeof process !== "undefined" ? process.env : undefined;
const isBrowser = typeof window !== "undefined";

const upstreamBaseUrl =
  (env?.NEXT_PUBLIC_API_BASE as string) ||
  "https://29abc00c5a14.one247.io";

const baseUrl = isBrowser ? "/api/backend" : upstreamBaseUrl;
export const apiConfig = {
  baseUrl,
  upstreamBaseUrl,
  authCookieName: "sm_session",
  authCookieMaxAge: 86400,
} as const;

export default apiConfig;
