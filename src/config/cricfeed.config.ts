/**
 * Cricfeed scorecard embed — set in `.env.local` (never commit real tokens).
 *
 * - NEXT_PUBLIC_CRICFEED_EMBED_HOST — hostname only, e.g. `feed.cricfeed.com`
 * - NEXT_PUBLIC_CRICFEED_TOKEN — API key / token for `embed.js?token=...`
 * - NEXT_PUBLIC_CRICFEED_FORCE_MOTION — optional `true` / `1` / `yes` → `data-cf-force-motion`
 */
export type CricfeedEmbedConfig = {
  host: string;
  token: string;
  scriptOrigin: string;
  /** Maps to `data-cf-force-motion` on the container when true. */
  forceMotion: boolean;
};

function normalizeHost(raw: string | undefined): string {
  const h = String(raw ?? "feed.cricfeed.com")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return h || "feed.cricfeed.com";
}

export function getCricfeedEmbedConfig(): CricfeedEmbedConfig {
  const host = normalizeHost(
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CRICFEED_EMBED_HOST
      : undefined,
  );
  const token = String(
    (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_CRICFEED_TOKEN : "") ??
      "",
  ).trim();
  const fm = String(
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CRICFEED_FORCE_MOTION
      : "") ?? "",
  )
    .trim()
    .toLowerCase();
  const forceMotion = fm === "1" || fm === "true" || fm === "yes";
  return {
    host,
    token,
    scriptOrigin: `https://${host}`,
    forceMotion,
  };
}

export function isCricfeedEmbedConfigured(): boolean {
  return Boolean(getCricfeedEmbedConfig().token);
}
