"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  getCricfeedEmbedConfig,
  isCricfeedEmbedConfigured,
} from "@/config/cricfeed.config";

function safeDivIdSuffix(matchId: string): string {
  const s = matchId.trim() || "match";
  return s.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
}

type Props = {
  /** Value for `data-score-mid` — use event **sourceId** when the feed expects it. */
  matchId: string;
};

/**
 * Loads provider `embed.js` once per mount; container gets `data-score-mid`.
 * Token and host come from env — see `cricfeed.config.ts`.
 */
export function CricfeedScorecardEmbed({ matchId }: Props) {
  const reactId = useId().replace(/:/g, "");
  const containerId = useMemo(
    () => `cricfeed-score-${safeDivIdSuffix(matchId)}-${reactId}`,
    [matchId, reactId],
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const configured = isCricfeedEmbedConfigured();

  // Listen for 'Match not found' or other errors sent via postMessage by the embed script
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (
          data &&
          typeof data === "object" &&
          data.type === "error" &&
          String(data.message || "").includes("Match not found")
        ) {
          setHasError(true);
        }
      } catch {
        // ignore non-json messages
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    if (!configured || !matchId.trim() || hasError) return;

    const { host, token } = getCricfeedEmbedConfig();
    const src = `https://${host}/embed.js?token=${encodeURIComponent(token)}&divId=${encodeURIComponent(containerId)}`;

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.cricfeedEmbed = "1";

    const onError = () => {
      setLoadError("Score widget failed to load.");
    };
    script.addEventListener("error", onError);

    document.body.appendChild(script);

    return () => {
      script.removeEventListener("error", onError);
      script.remove();
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
    };
  }, [configured, matchId, containerId, hasError]);

  if (!configured || hasError || !matchId.trim()) {
    return null;
  }

  const forceMotion = getCricfeedEmbedConfig().forceMotion;

  return (
    <div className="w-full">
      {loadError ? (
        <p className="py-2 text-center text-xs text-error" role="alert">
          {loadError}
        </p>
      ) : null}
      <div
        id={containerId}
        data-score-mid={matchId.trim()}
        data-cf-force-motion={forceMotion ? "true" : undefined}
      />
    </div>
  );
}
