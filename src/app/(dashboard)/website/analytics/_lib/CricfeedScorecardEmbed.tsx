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

  const configured = isCricfeedEmbedConfigured();

  useEffect(() => {
    if (!configured || !matchId.trim()) return;

    const { host, token } = getCricfeedEmbedConfig();
    const src = `https://${host}/embed.js?token=${encodeURIComponent(token)}&divId=${encodeURIComponent(containerId)}`;

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.cricfeedEmbed = "1";

    const onError = () => {
      setLoadError("Score widget failed to load. Check host, token, and network.");
    };
    script.addEventListener("error", onError);

    document.body.appendChild(script);

    return () => {
      script.removeEventListener("error", onError);
      script.remove();
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = "";
      setLoadError(null);
    };
  }, [configured, matchId, containerId]);

  if (!configured) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-muted/30 px-4 py-6 text-center text-sm text-muted">
        Score widget: set
        <code className="rounded bg-surface-muted px-1 text-xs">
          NEXT_PUBLIC_CRICFEED_TOKEN
        </code>
        (and optionally
        <code className="rounded bg-surface-muted px-1 text-xs">
          NEXT_PUBLIC_CRICFEED_EMBED_HOST
        </code>
        ) in <code className="rounded bg-surface-muted px-1 text-xs">.env.local</code>.
      </div>
    );
  }

  if (!matchId.trim()) {
    return null;
  }

  const forceMotion = getCricfeedEmbedConfig().forceMotion;

  return (
    <section
      className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30"
      aria-label="Live scorecard"
    >
      <div className="border-b border-zinc-200/80 bg-zinc-50/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-tertiary dark:border-zinc-800 dark:bg-zinc-900/50">
        Live score
      </div>
      <div className="min-h-[120px] p-2 sm:p-3">
        {loadError ? (
          <p className="text-center text-sm text-error" role="alert">
            {loadError}
          </p>
        ) : null}
        <div
          id={containerId}
          data-score-mid={matchId.trim()}
          data-cf-force-motion={forceMotion ? "true" : undefined}
        />
      </div>
    </section>
  );
}
