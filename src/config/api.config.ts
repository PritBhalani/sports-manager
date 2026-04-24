const env = typeof process !== "undefined" ? process.env : undefined;
const isBrowser = typeof window !== "undefined";

const upstreamBaseUrl =
  (env?.NEXT_PUBLIC_API_BASE as string) ||
  "https://f768dafd155e.drpapaya.ai";

const baseUrl = upstreamBaseUrl;
export const apiConfig = {
  baseUrl,
  upstreamBaseUrl,
  authCookieName: "sm_session",
  authCookieMaxAge: 86400,
} as const;

export default apiConfig;
