"use client";

import "./scoreboard-table.css";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  PlayCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { PageHeader, ListPageFrame, Button } from "@/components";
import { getLiveBetsByEventId } from "@/services/bet.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { formatDateTime } from "@/utils/date";
import {
  eventMarketTitle,
  formatBetCardDateTime,
  liveBetAvgDisplay,
  liveBetEventAndMarketNames,
  liveBetIdDisplay,
  liveBetMemberName,
  liveBetOddsDisplay,
  liveBetStakeForDisplay,
} from "@/app/(dashboard)/website/analytics/_lib/liveBetDisplay";
import { BetCard } from "@/app/(dashboard)/website/analytics/_lib/BetCard";
import { CricfeedScorecardEmbed } from "@/app/(dashboard)/website/analytics/_lib/CricfeedScorecardEmbed";
import { TennisScoreCard } from "@/app/(dashboard)/website/analytics/_lib/TennisScoreCard";
import { FootballScoreCard } from "@/app/(dashboard)/website/analytics/_lib/FootballScoreCard";
import { resolveScoreboardSport } from "@/app/(dashboard)/website/analytics/_lib/scoreboardSport";
import { getEventType, type EventTypeRecord } from "@/services/eventtype.service";
import {
  getEventScoreMidForEmbed,
  getEventSourceIdForWsSubscribe,
} from "@/app/(dashboard)/website/analytics/_lib/eventScoreMid";
import { getOtherMarketsByEventAndMatchOddsId } from "@/services/marketodds.service";
import { updateMarketLockStatus } from "@/services/market.service";
import {
  getExposureByMarketIds,
  getFancyExposureByMarketIds,
  getMarketByEventTypeId,
  getMarketCatalogByMarketId,
  mergeMarketCatalogForEvent,
  mergeMarketsIntoEvent,
  type MarketByEventMarket,
  type MarketByEventRow,
  type RunnerExposureRow,
} from "@/services/position.service";
import {
  bestBackLevels,
  bestLayLevels,
  collectAllMarketIdsFromEvent,
  findMatchOddsMarketStrict,
  formatLiquidity,
  formatOddsPrice,
  getDisplayCurrencyRate,
  isMatchOddsMarketByMeta,
  lookupRunnerBook,
  normalizeMarketTypeKey,
  isGoalsOverUnderMarket,
  sortGoalsOverUnderMarkets,
  useWebsitePriceBookWs,
  type WsRunnerBookRow,
} from "@/app/(dashboard)/website/analytics/_lib/websitePriceBook";

function isBookmakerMarket(m: MarketByEventMarket) {
  const t = normalizeMarketTypeKey(m);
  const n = String(m.name ?? "").toLowerCase();
  if (n.includes("bookmaker")) return true;
  if (/\bspecial\s+maker\b/.test(n)) return true;
  if (t === "BOOKMAKER" || t === "BOOK_MAKER") return true;
  if (t === "SPECIAL_MAKER" || t.includes("SPECIAL_MAKER")) return true;
  return t.includes("BOOKMAKER");
}

/** Yes/No exchange ladder — show under main match, not inside Fancy tabs. */
function isTiedMatchMarket(m: MarketByEventMarket) {
  const t = normalizeMarketTypeKey(m);
  if (t === "TIED_MATCH" || t.includes("TIED_MATCH")) return true;
  return /\btied\s+match\b/i.test(String(m.name ?? ""));
}

function sortMarketsByDisplayOrder(markets: MarketByEventMarket[]) {
  return [...markets].sort((a, b) => {
    const da = Number((a as { displayOrder?: unknown }).displayOrder);
    const db = Number((b as { displayOrder?: unknown }).displayOrder);
    const na = Number.isFinite(da) ? da : 0;
    const nb = Number.isFinite(db) ? db : 0;
    if (na !== nb) return na - nb;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });
}

function readEventBetLocked(ev: MarketByEventRow): boolean {
  const o = ev as Record<string, unknown>;
  const v =
    o.isBetLock ??
    o.isBetLocked ??
    o.betLocked ??
    o.eventBetLocked ??
    o.isLock;
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1") return true;
  if (v === 0 || v === "0") return false;
  if (typeof v === "string" && v.toLowerCase() === "true") return true;
  return false;
}

function ingestRunnerExposureRows(
  rows: RunnerExposureRow[],
  into: Map<string, number>,
): void {
  for (const r of rows) {
    const mid = r.marketId != null ? String(r.marketId).trim() : "";
    const rid = r.runnerId != null ? String(r.runnerId).trim() : "";
    if (!mid || !rid || r.pl === undefined || r.pl === null) continue;
    const n = Number(r.pl);
    if (!Number.isFinite(n)) continue;
    into.set(`${mid}:${rid}`, n);
  }
}

function tabKeyForMarket(
  m: MarketByEventMarket, 
): "fancy" | "line" | "winning" | "khado" {
  const t = normalizeMarketTypeKey(m);
  const n = String(m.name ?? "").toLowerCase();
  const bt = Number(m.bettingType);
  if (bt === 6) return "winning";
  if (bt === 11) return "khado";
  if (bt === 2) return "line";
  if (t.includes("LINE") || /\bline\b/.test(n)) return "line";
  if (t.includes("WINNING") || /\bwinning\b/.test(n)) return "winning";
  if (t.includes("KHADO") || /\bkhado\b/.test(n)) return "khado";
  return "fancy";
}

/** Fancy tab: only SESSION markets (`bettingType` 7 — same as commission `session` in players UI). */
const BETTING_TYPE_SESSION_FANCY = 7;

function isSessionFancyBettingType(m: MarketByEventMarket) {
  return Number(m.bettingType) === BETTING_TYPE_SESSION_FANCY;
}

function marketLabel(m: MarketByEventMarket) {
  return String(m.name ?? "—");
}

/** REST: `temporaryStatus === 2` ⇒ ball running (matches one247 `ball` row state). */
function isBallRunningMarket(m: MarketByEventMarket | undefined) {
  if (!m) return false;
  const ts = Number(m.temporaryStatus);
  return Number.isFinite(ts) && ts === 2;
}

function hasFinitePrice(level: { price?: number }) {
  return level.price != null && Number.isFinite(level.price);
}

const EMPTY_LEVEL: { price?: number; size?: number; percentage?: number } = {};

function ScoreboardBetAllRow({ title }: { title: string }) {
  return (
    <tr className="bet-all">
      <th className="th-col align-l" colSpan={7}>
        <div className="flex items-center gap-3 py-1">
          <span className="sb-market-title text-sm font-bold text-[#0066cc] dark:text-sky-400">{title}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="text-zinc-400 hover:text-red-500 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button type="button" className="text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              <BarChart3 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </th>
    </tr>
  );
}

function ScoreboardBackLayLabelRow() {
  return (
    <tr className="sb-back-lay-labels">
      <th className="sb-corner" scope="row" />
      <th
        colSpan={3}
        className="text-center text-[10px] font-bold uppercase tracking-wider"
      >
        Back
      </th>
      <th
        colSpan={3}
        className="text-center text-[10px] font-bold uppercase tracking-wider"
      >
        Lay
      </th>
    </tr>
  );
}

function LadderColGroup() {
  return (
    <colgroup>
      <col style={{ width: "45%" }} />
      <col style={{ width: "9.16%" }} />
      <col style={{ width: "9.16%" }} />
      <col style={{ width: "9.16%" }} />
      <col style={{ width: "9.16%" }} />
      <col style={{ width: "9.16%" }} />
      <col style={{ width: "9.16%" }} />
    </colgroup>
  );
}

function WinningColGroup() {
  return (
    <colgroup>
      <col style={{ width: "38%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "38%" }} />
      <col style={{ width: "12%" }} />
    </colgroup>
  );
}

/** Live site: bold price on top, size / % smaller below — same for Back and Lay. */
function ScorePriceButton({
  level,
  isLay,
}: {
  level: { price?: number; size?: number; percentage?: number };
  isLay?: boolean;
}) {
  const rate = getDisplayCurrencyRate();
  const priceStr = formatOddsPrice(level.price);
  const pct =
    level.percentage != null && Number.isFinite(level.percentage)
      ? String(Math.round(level.percentage))
      : "";
  const vol = formatLiquidity(level.size != null ? level.size * rate : undefined);
  const hasPct = Boolean(pct);
  const sub = hasPct ? pct : vol;
  const hasPrice = level.price != null && Number.isFinite(level.price);

  if (!hasPrice) {
    return <span className="price onlyprice">&nbsp;</span>;
  }

  return (
    <button
      type="button"
      className={`price ${sub ? "" : "onlyprice"} rounded-md`}
    >
      <span className="block tabular-nums sb-odds-price font-bold">{priceStr}</span>
      {sub ? (
        <span
          className={`size block tabular-nums font-semibold ${hasPct ? "percentage" : "opacity-70 text-[10px]"}`}
        >
          {sub}
        </span>
      ) : null}
    </button>
  );
}

function SettingToggleRow({
  label,
  on,
  disabled,
  onToggle,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onToggle()}
      className="flex items-center gap-2 rounded-md text-left text-xs text-foreground-secondary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="max-w-[12rem] leading-tight">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          on
            ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
            : "bg-surface-muted text-foreground-tertiary"
        }`}
      >
        {on ? "YES" : "NO"}
      </span>
    </button>
  );
}

function runnerExposurePlFromMap(
  map: Map<string, number>,
  marketId: string | undefined,
  runnerId: string | undefined | null,
): number | undefined {
  if (!marketId?.trim() || runnerId == null || !String(runnerId).trim()) {
    return undefined;
  }
  const k = `${marketId.trim()}:${String(runnerId).trim()}`;
  if (!map.has(k)) return undefined;
  return map.get(k);
}

function MatchTitleCell({
  name,
  exposurePl,
}: {
  name: string;
  exposurePl?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="mb-0 min-w-0 flex-1 text-[#0066cc] dark:text-sky-400">{name}</p>
      {exposurePl !== undefined ? (
        <span
          className={`shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums ${signedAmountTextClass(exposurePl)}`}
        >
          {formatCurrency(exposurePl)}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Exchange / bookmaker ladder row. Empty slots use neutral cells (live site).
 * `bookmaker-center`: only best back + best lay columns tinted (2nd runner on bookmaker markets).
 */
function LadderRow({
  name,
  runnerBook,
  stripe,
  variant,
  market,
  exposurePl,
}: {
  name: string;
  runnerBook?: WsRunnerBookRow;
  stripe?: "even" | "odd";
  variant: "exchange" | "bookmaker-full" | "bookmaker-center";
  market?: MarketByEventMarket;
  /** From POST /position/getexposurebymarketids (`pl`), shown like the live site. */
  exposurePl?: number;
}) {
  const backs = bestBackLevels(runnerBook, 3);
  const lays = bestLayLevels(runnerBook, 3);
  const backsDisplay = [...backs].reverse();
  const laysForColumns = lays;
  const hasBook =
    backs.some((b: { price?: number }) => hasFinitePrice(b)) ||
    lays.some((l: { price?: number }) => hasFinitePrice(l));
  const apiBall = isBallRunningMarket(market);
  const zebra = stripe === "even" ? "even" : stripe === "odd" ? "odd" : "";

  if (apiBall || !hasBook) {
    return (
      <tr className={`tr-data ${zebra}`}>
        <th className="match-title" scope="row">
          <MatchTitleCell name={name} exposurePl={exposurePl} />
        </th>
        <td colSpan={6} className="sb-ball-running">
          BALL RUNNING
        </td>
      </tr>
    );
  }

  if (variant === "bookmaker-center") {
    const back = backs[0] ?? EMPTY_LEVEL;
    const lay = lays[0] ?? EMPTY_LEVEL;
    const hasCenter = hasFinitePrice(back) || hasFinitePrice(lay);
    if (!hasCenter) {
      return (
        <tr className={`tr-data ${zebra}`}>
          <th className="match-title" scope="row">
            <MatchTitleCell name={name} exposurePl={exposurePl} />
          </th>
          <td colSpan={6} className="sb-ball-running">
            BALL RUNNING
          </td>
        </tr>
      );
    }
    return (
      <tr className={`tr-data ${zebra}`}>
        <th className="match-title" scope="row">
          <MatchTitleCell name={name} exposurePl={exposurePl} />
        </th>
        <td className="sb-odds-neutral align-c">
          <ScorePriceButton level={EMPTY_LEVEL} />
        </td>
        <td className="sb-odds-neutral align-c">
          <ScorePriceButton level={EMPTY_LEVEL} />
        </td>
        <td className="back-1 align-c">
          <ScorePriceButton level={back} />
        </td>
        <td className="lay-1 align-c">
          <ScorePriceButton level={lay} />
        </td>
        <td className="sb-odds-neutral align-c">
          <ScorePriceButton level={EMPTY_LEVEL} />
        </td>
        <td className="sb-odds-neutral align-c">
          <ScorePriceButton level={EMPTY_LEVEL} />
        </td>
      </tr>
    );
  }

  return (
    <tr className={`tr-data ${zebra}`}>
      <th className="match-title" scope="row">
        <MatchTitleCell name={name} exposurePl={exposurePl} />
      </th>
      {laysForColumns.map((lvl: { price?: number; size?: number; percentage?: number }, i: number) => (
        <td
          key={`l-${i}`}
          className={`lay-${i + 1} align-c p-1`}
        >
          <ScorePriceButton level={lvl} isLay />
        </td>
      ))}
      {backsDisplay.map((lvl: { price?: number; size?: number; percentage?: number }, i: number) => (
        <td
          key={`b-${i}`}
          className={`back-${3 - i} align-c p-1`}
        >
          <ScorePriceButton level={lvl} />
        </td>
      ))}
    </tr>
  );
}

export default function WebsiteEventMarketsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventIdParam = params?.eventId;
  const eventId = decodeURIComponent(
    Array.isArray(eventIdParam) ? (eventIdParam[0] ?? "") : (eventIdParam ?? ""),
  );
  const eventTypeId = searchParams.get("eventTypeId")?.trim() || "-1";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventRow, setEventRow] = useState<MarketByEventRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fancyTab, setFancyTab] = useState<"fancy" | "line" | "winning" | "khado">(
    "fancy",
  );
  const [betRows, setBetRows] = useState<Record<string, unknown>[]>([]);
  const [betTotal, setBetTotal] = useState(0);
  const [betsLoading, setBetsLoading] = useState(false);
  const [betsError, setBetsError] = useState<string | null>(null);
  const [betStatusFilter, setBetStatusFilter] = useState<"" | "matched" | "unmatched">(
    "matched",
  );
  /** `-1` = all sides (same convention as sports bet list); `1` / `2` = back / lay only. */
  const [betSideFilter, setBetSideFilter] = useState("-1");
  const [selectedMarketId, setSelectedMarketId] = useState("");
  const [eventTypeRecords, setEventTypeRecords] = useState<EventTypeRecord[]>([]);
  const [runnerExposureMap, setRunnerExposureMap] = useState<
    Map<string, number>
  >(() => new Map());
  const [includePT, setIncludePT] = useState(false);
  const [eventBetLocked, setEventBetLocked] = useState(false);
  const [lockUpdating, setLockUpdating] = useState(false);

  useEffect(() => {
    getEventType()
      .then((list) => setEventTypeRecords(Array.isArray(list) ? list : []))
      .catch(() => setEventTypeRecords([]));
  }, []);

  useEffect(() => {
    if (!eventRow) {
      setEventBetLocked(false);
      return;
    }
    setEventBetLocked(readEventBetLocked(eventRow));
  }, [eventRow]);

  const loadEvent = useCallback(async () => {
    if (!eventId) {
      setEventRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const loadForTypeId = async (tid: string): Promise<MarketByEventRow | null> => {
      const [wide, narrow] = await Promise.all([
        getMarketByEventTypeId(tid, true),
        getMarketByEventTypeId(tid, false),
      ]);
      const ra = wide.find((r) => String(r.id ?? "") === eventId) ?? null;
      const rb = narrow.find((r) => String(r.id ?? "") === eventId) ?? null;
      return mergeMarketCatalogForEvent(ra, rb);
    };
    try {
      const typeIds = [...new Set([eventTypeId, "-1"])];
      let found: MarketByEventRow | null = null;
      for (const tid of typeIds) {
        const piece = await loadForTypeId(tid);
        if (!piece) continue;
        found = found ? mergeMarketCatalogForEvent(found, piece) : piece;
      }

      if (found) {
        const match = findMatchOddsMarketStrict(found);
        const matchMid = match?.id != null ? String(match.id).trim() : "";
        if (matchMid) {
          const [catalogMo, otherMs] = await Promise.all([
            getMarketCatalogByMarketId(matchMid).catch(() => null),
            getOtherMarketsByEventAndMatchOddsId(eventId, matchMid).catch(
              () => [] as MarketByEventMarket[],
            ),
          ]);
          let merged = found;
          if (catalogMo) merged = mergeMarketsIntoEvent(merged, [catalogMo]);
          if (otherMs.length) merged = mergeMarketsIntoEvent(merged, otherMs);
          found = merged;
        }
      }

      setEventRow(found);
      if (!found) setError("Event not found. Open it again from Website analytics.");
    } catch (e) {
      setEventRow(null);
      setError(e instanceof Error ? e.message : "Failed to load event.");
    } finally {
      setLoading(false);
    }
  }, [eventId, eventTypeId, refreshKey]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  const marketIds = useMemo(() => collectAllMarketIdsFromEvent(eventRow), [eventRow]);
  const wsEventSubscribeId = useMemo(
    () => getEventSourceIdForWsSubscribe(eventRow),
    [eventRow],
  );
  const { priceBooks, scores, wsConnected, wsAuthed, wsNote } = useWebsitePriceBookWs({
    marketIds,
    wsEventSubscribeId,
    onRefreshSignal: () => setRefreshKey((k) => k + 1),
  });

  const title = String(eventRow?.name ?? eventRow?.raceName ?? "Event");
  const matchMarket = eventRow ? findMatchOddsMarketStrict(eventRow) : undefined;
  const matchMarketId =
    matchMarket?.id != null ? String(matchMarket.id) : undefined;
  const wsMatchBook = matchMarketId ? priceBooks[matchMarketId] : undefined;

  const loadEventBets = useCallback(() => {
    const eid = eventId.trim();
    const mid = selectedMarketId.trim();
    if (!eid) {
      setBetRows([]);
      setBetTotal(0);
      return;
    }
    setBetsLoading(true);
    setBetsError(null);
    getLiveBetsByEventId(
      {
        pageSize: 50,
        groupBy: "",
        page: 1,
        orderBy: "createdon",
        orderByDesc: true,
      },
      {
        eventId: eid,
        side: betSideFilter,
        ...(betStatusFilter ? { status: betStatusFilter } : {}),
        ...(mid ? { marketId: mid } : {}),
      },
    )
      .then((res) => {
        setBetRows((res.items ?? []) as Record<string, unknown>[]);
        setBetTotal(res.total ?? 0);
      })
      .catch((e) => {
        setBetRows([]);
        setBetTotal(0);
        setBetsError(e instanceof Error ? e.message : "Failed to load live bets.");
      })
      .finally(() => setBetsLoading(false));
  }, [
    eventId,
    selectedMarketId,
    betStatusFilter,
    betSideFilter,
    refreshKey,
  ]);

  useEffect(() => {
    if (!eventId.trim()) {
      setBetRows([]);
      setBetTotal(0);
      return;
    }
    loadEventBets();
  }, [eventId, selectedMarketId, betStatusFilter, betSideFilter, refreshKey, loadEventBets]);

  const inPlay =
    wsMatchBook?.ip !== undefined
      ? Boolean(wsMatchBook.ip)
      : Boolean(matchMarket?.inPlay);

  const scoreMidForEmbed = useMemo(
    () => getEventScoreMidForEmbed(eventRow, eventId),
    [eventRow, eventId],
  );

  const scoreboardSport = useMemo(
    () => resolveScoreboardSport(eventTypeId, eventTypeRecords, eventRow),
    [eventTypeId, eventTypeRecords, eventRow],
  );

  const bookmakerMarkets = useMemo(() => {
    const all = eventRow?.markets ?? [];
    return sortMarketsByDisplayOrder(
      all.filter(
        (m) =>
          isBookmakerMarket(m) &&
          !isMatchOddsMarketByMeta(m) &&
          !isTiedMatchMarket(m),
      ),
    );
  }, [eventRow]);

  const tiedMatchMarkets = useMemo(() => {
    const all = eventRow?.markets ?? [];
    const mid = matchMarket?.id != null ? String(matchMarket.id) : "";
    return sortMarketsByDisplayOrder(
      all.filter(
        (m) =>
          isTiedMatchMarket(m) &&
          (!mid || String(m.id ?? "") !== mid) &&
          m.id != null &&
          String(m.id).trim(),
      ),
    );
  }, [eventRow, matchMarket?.id]);

  const goalsOverUnderMarkets = useMemo(() => {
    const all = eventRow?.markets ?? [];
    const mid = matchMarket?.id != null ? String(matchMarket.id) : "";
    return sortGoalsOverUnderMarkets(
      all.filter(
        (m) =>
          (!mid || String(m.id ?? "") !== mid) &&
          !isBookmakerMarket(m) &&
          !isTiedMatchMarket(m) &&
          isGoalsOverUnderMarket(m),
      ),
    );
  }, [eventRow, matchMarket?.id]);

  const otherMarkets = useMemo(() => {
    const all = eventRow?.markets ?? [];
    const mid = matchMarket?.id != null ? String(matchMarket.id) : "";
    return all.filter((m) => {
      if (mid && String(m.id ?? "") === mid) return false;
      if (isBookmakerMarket(m)) return false;
      if (isTiedMatchMarket(m)) return false;
      if (isGoalsOverUnderMarket(m)) return false;
      return true;
    });
  }, [eventRow, matchMarket?.id]);

  const tabCounts = useMemo(
    () => ({
      fancy: otherMarkets.filter(
        (m) =>
          tabKeyForMarket(m) === "fancy" && isSessionFancyBettingType(m),
      ).length,
      line: otherMarkets.filter((m) => tabKeyForMarket(m) === "line").length,
      winning: otherMarkets.filter((m) => tabKeyForMarket(m) === "winning").length,
      khado: otherMarkets.filter((m) => tabKeyForMarket(m) === "khado").length,
    }),
    [otherMarkets],
  );

  const tabMarkets = useMemo(
    () =>
      otherMarkets.filter((m) => {
        if (tabKeyForMarket(m) !== fancyTab) return false;
        if (fancyTab === "fancy") return isSessionFancyBettingType(m);
        return true;
      }),
    [otherMarkets, fancyTab],
  );

  const fancyExposureMarketIds = useMemo(
    () => [
      ...new Set(
        otherMarkets.map((m) => String(m.id ?? "").trim()).filter(Boolean),
      ),
    ],
    [otherMarkets],
  );

  useEffect(() => {
    if (!eventRow) {
      setRunnerExposureMap(new Map());
      return;
    }
    const allIds = collectAllMarketIdsFromEvent(eventRow);
    let cancelled = false;

    const run = async () => {
      try {
        const [mainRows, fancyRows] = await Promise.all([
          allIds.length > 0
            ? getExposureByMarketIds(allIds, includePT)
            : Promise.resolve([] as RunnerExposureRow[]),
          fancyExposureMarketIds.length > 0
            ? getFancyExposureByMarketIds(fancyExposureMarketIds, includePT)
            : Promise.resolve([] as RunnerExposureRow[]),
        ]);
        if (cancelled) return;
        const next = new Map<string, number>();
        ingestRunnerExposureRows(mainRows, next);
        ingestRunnerExposureRows(fancyRows, next);
        setRunnerExposureMap(next);
      } catch {
        if (!cancelled) setRunnerExposureMap(new Map());
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [eventRow, refreshKey, includePT, fancyExposureMarketIds]);

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title={loading ? "Event markets" : title}
        breadcrumbs={["Website", "Analytics", "Event"]}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/website/analytics"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Markets list
            </Link>
            <Button
              variant="outline"
              size="sm"
              type="button"
              leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <div
        className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm ${
          wsConnected && wsAuthed
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200"
            : "border-border bg-surface-muted/40 text-foreground-secondary"
        }`}
        role="status"
      >
        {wsConnected && wsAuthed ? (
          <Wifi className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span>
          {wsConnected && wsAuthed
            ? "Live prices: connected."
            : wsConnected
              ? "WebSocket connected; authenticating…"
              : "Live prices offline — REST only."}
          {wsNote ? ` ${wsNote}` : null}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <ListPageFrame>
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30">
              <div className="bg-[#4a5548] px-4 py-3.5 text-center text-base font-semibold tracking-tight text-white dark:bg-[#3d453d]">
                {title}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex flex-wrap items-center gap-3">
                  {inPlay ? (
                    <div className="flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      <PlayCircle className="h-4 w-4" aria-hidden />
                      Inplay
                    </div>
                  ) : (
                    <span className="text-sm text-foreground-secondary">Pre-match</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4">
                  <SettingToggleRow
                    label="Event Bet Locked?"
                    on={eventBetLocked}
                    disabled={!eventId.trim() || lockUpdating}
                    onToggle={async () => {
                      const eid = eventId.trim();
                      if (!eid || lockUpdating) return;
                      const next = !eventBetLocked;
                      setLockUpdating(true);
                      try {
                        await updateMarketLockStatus({
                          nodeId: eid,
                          isLock: next,
                          nodeType: 4,
                        });
                        setEventBetLocked(next);
                      } finally {
                        setLockUpdating(false);
                      }
                    }}
                  />
                  <SettingToggleRow
                    label="Include PT?"
                    on={includePT}
                    onToggle={() => setIncludePT((v) => !v)}
                  />
                </div>
              </div>
            </div>

            {eventId.trim() && inPlay && scoreboardSport === "cricket" ? (
              <CricfeedScorecardEmbed matchId={scoreMidForEmbed} />
            ) : null}

            {eventId.trim() && inPlay && scoreboardSport === "tennis" && scores[wsEventSubscribeId] ? (
              <TennisScoreCard score={scores[wsEventSubscribeId] as any} />
            ) : null}

            {eventId.trim() && inPlay && scoreboardSport === "football" && scores[wsEventSubscribeId] ? (
              <FootballScoreCard score={scores[wsEventSubscribeId] as any} />
            ) : null}

            {loading ? (
              <p className="text-sm text-foreground-secondary">Loading event…</p>
            ) : !eventRow ? null : (
              <>
                {matchMarket && matchMarketId ? (
                  <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30">
                    <div className="overflow-x-auto">
                      <table className="table-score">
                        <LadderColGroup />
                        <tbody>
                          <ScoreboardBetAllRow title="Match Odds" />
                          {(matchMarket.marketRunner ?? []).map((entry: any, rowIdx: number) => {
                            const rid = entry.runner?.id;
                            const rname = String(entry.runner?.name ?? "—");
                            const book = lookupRunnerBook(
                              priceBooks,
                              matchMarketId,
                              rid != null ? String(rid) : undefined,
                            );
                            return (
                              <LadderRow
                                key={String(rid ?? rname)}
                                name={rname}
                                runnerBook={book}
                                stripe={rowIdx % 2 === 0 ? "odd" : "even"}
                                variant="exchange"
                                market={matchMarket}
                                exposurePl={runnerExposurePlFromMap(
                                  runnerExposureMap,
                                  matchMarketId,
                                  rid != null ? String(rid) : undefined,
                                )}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : null}

                {tiedMatchMarkets.map((m) => {
                  const mid = String(m.id);
                  return (
                    <section
                      key={mid}
                      className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30"
                    >
                      <div className="overflow-x-auto">
                        <table className="table-score">
                          <LadderColGroup />
                          <tbody>
                            <ScoreboardBetAllRow title={marketLabel(m)} />
                            {(m.marketRunner ?? []).map((entry: any, rowIdx: number) => {
                              const rid = entry.runner?.id;
                              const rname = String(entry.runner?.name ?? "—");
                              const book = lookupRunnerBook(
                                priceBooks,
                                mid,
                                rid != null ? String(rid) : undefined,
                              );
                              return (
                                <LadderRow
                                  key={String(rid ?? rname)}
                                  name={rname}
                                  runnerBook={book}
                                  stripe={rowIdx % 2 === 0 ? "odd" : "even"}
                                  variant="exchange"
                                  market={m}
                                  exposurePl={runnerExposurePlFromMap(
                                    runnerExposureMap,
                                    mid,
                                    rid != null ? String(rid) : undefined,
                                  )}
                                />
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                })}

                {goalsOverUnderMarkets
                  .filter((m: any) => m.id != null && String(m.id).trim())
                  .map((m: any) => {
                  const mid = String(m.id);
                  return (
                    <section
                      key={mid}
                      className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30"
                    >
                      <div className="overflow-x-auto">
                        <table className="table-score">
                          <LadderColGroup />
                          <tbody>
                            <ScoreboardBetAllRow title={marketLabel(m)} />
                            {(m.marketRunner ?? []).map((entry: any, rowIdx: number) => {
                              const rid = entry.runner?.id;
                              const rname = String(entry.runner?.name ?? "—");
                              const book = lookupRunnerBook(
                                priceBooks,
                                mid,
                                rid != null ? String(rid) : undefined,
                              );
                              return (
                                <LadderRow
                                  key={String(rid ?? rname)}
                                  name={rname}
                                  runnerBook={book}
                                  stripe={rowIdx % 2 === 0 ? "odd" : "even"}
                                  variant="exchange"
                                  market={m}
                                  exposurePl={runnerExposurePlFromMap(
                                    runnerExposureMap,
                                    mid,
                                    rid != null ? String(rid) : undefined,
                                  )}
                                />
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                  })}

                {bookmakerMarkets.map((m) => {
                  const mid = m.id != null ? String(m.id) : "";
                  const entries = m.marketRunner?.length
                    ? m.marketRunner
                    : [];
                  return (
                    <section
                      key={mid || marketLabel(m)}
                      className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30"
                    >
                      <div className="overflow-x-auto">
                        <table className="table-score">
                          <LadderColGroup />
                          <tbody>
                            <ScoreboardBetAllRow title={marketLabel(m)} />
                            {entries.length === 0 ? (
                              <LadderRow
                                name={marketLabel(m)}
                                runnerBook={undefined}
                                stripe="odd"
                                variant="bookmaker-full"
                                market={m}
                              />
                            ) : (
                              entries.map((entry, j) => {
                                const rid = entry.runner?.id;
                                const rname = String(
                                  entry.runner?.name ?? marketLabel(m),
                                );
                                const book = lookupRunnerBook(
                                  priceBooks,
                                  mid || undefined,
                                  rid != null ? String(rid) : undefined,
                                );
                                return (
                                  <LadderRow
                                    key={`${mid}-${String(rid ?? rname)}`}
                                    name={rname}
                                    runnerBook={book}
                                    stripe={j % 2 === 0 ? "odd" : "even"}
                                    variant={
                                      j === 0 ? "bookmaker-full" : "bookmaker-center"
                                    }
                                    market={m}
                                    exposurePl={runnerExposurePlFromMap(
                                      runnerExposureMap,
                                      mid || undefined,
                                      rid != null ? String(rid) : undefined,
                                    )}
                                  />
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                })}

                <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30">
                  <ul className="sb-nav-tabs" role="tablist">
                    {(
                      [
                        ["fancy", "Fancy"],
                        ["line", "Line"],
                        ["winning", "Winning"],
                        ["khado", "Khado"],
                      ] as const
                    ).map(([id, lab]) => (
                      <li
                        key={id}
                        className={fancyTab === id ? "active" : ""}
                        role="presentation"
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={fancyTab === id}
                          onClick={() => setFancyTab(id)}
                        >
                          {lab}
                          <span className="badge">{tabCounts[id]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {tabMarkets.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                      No
                      {fancyTab === "fancy"
                        ? "fancy"
                        : fancyTab === "line"
                          ? "line"
                          : fancyTab === "winning"
                            ? "winning"
                            : "khado"}
                      markets for this event.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table-score">
                        {fancyTab === "winning" ? <WinningColGroup /> : <LadderColGroup />}
                        <tbody>

                          {tabMarkets.map((m, rowIdx) => {
                            const mid = m.id != null ? String(m.id) : "";
                            const runner = m.marketRunner?.[0];
                            const rid = runner?.runner?.id;
                            const rname = String(runner?.runner?.name || "RUNS");
                            const book = lookupRunnerBook(
                              priceBooks,
                              mid || undefined,
                              rid != null ? String(rid) : undefined,
                            );
                            const back = bestBackLevels(book, 1)[0] ?? EMPTY_LEVEL;
                            const lay = bestLayLevels(book, 1)[0] ?? EMPTY_LEVEL;
                            const has =
                              hasFinitePrice(back) || hasFinitePrice(lay);
                            const showBall =
                              isBallRunningMarket(m) || !has;
                            const fancyExposurePl = runnerExposurePlFromMap(
                              runnerExposureMap,
                              mid || undefined,
                              rid != null ? String(rid) : undefined,
                            );

                            const isWinning = fancyTab === "winning";

                            if (isWinning) {
                              const runners = m.marketRunner ?? [];
                              const runnerPairs: any[][] = [];
                              for (let i = 0; i < runners.length; i += 2) {
                                runnerPairs.push(runners.slice(i, i + 2));
                              }

                              return (
                                <Fragment key={mid || marketLabel(m)}>
                                  <tr className="bet-all">
                                    <th className="th-col align-l" colSpan={7}>
                                      <div className="flex items-center gap-2 py-1">
                                        <span className="text-[11px] font-bold uppercase text-zinc-700 dark:text-zinc-300">
                                          {marketLabel(m)}
                                        </span>
                                        <div className="flex items-center gap-1.5 opacity-60">
                                          <RefreshCw className="h-3 w-3" />
                                          <BarChart3 className="h-3 w-3" />
                                        </div>
                                      </div>
                                    </th>
                                  </tr>
                                  {runnerPairs.map((pair, pIdx) => (
                                    <tr key={pIdx} className="tr-data border-b border-zinc-100 dark:border-zinc-800/50">
                                      {pair.map((r, rIdx) => {
                                        const r_rid = r.runner?.id;
                                        const r_rname = String(r.runner?.name || "—");
                                        const r_book = lookupRunnerBook(
                                          priceBooks,
                                          mid || undefined,
                                          r_rid != null ? String(r_rid) : undefined,
                                        );
                                        const r_back = bestBackLevels(r_book, 1)[0] ?? EMPTY_LEVEL;
                                        const r_exposurePl = runnerExposurePlFromMap(
                                          runnerExposureMap,
                                          mid || undefined,
                                          r_rid != null ? String(r_rid) : undefined,
                                        );

                                        return (
                                          <Fragment key={String(r_rid ?? r_rname)}>
                                            <th className="match-title !w-auto" scope="row">
                                              <MatchTitleCell
                                                name={r_rname}
                                                exposurePl={r_exposurePl}
                                              />
                                            </th>
                                            <td className="back-1 align-c !w-[60px] p-1">
                                              <ScorePriceButton level={r_back} />
                                            </td>
                                            {rIdx === 0 && pair.length === 1 && (
                                              <>
                                                <td className="!w-auto bg-zinc-50/30 dark:bg-zinc-900/30" />
                                                <td className="!w-[60px] bg-zinc-50/30 dark:bg-zinc-900/30" />
                                              </>
                                            )}
                                          </Fragment>
                                        );
                                      })}
                                      {pair.length === 2 ? null : null}
                                      {/* Spacer columns to maintain 7-col layout if needed, 
                                          but we are using custom widths here. 
                                          The colgroup will still apply, so we might need to 
                                          span the rest of the 7 cols if only 1 runner. */}
                                      {pair.length === 1 ? (
                                        <td colSpan={3} className="bg-zinc-50/30 dark:bg-zinc-900/30" />
                                      ) : pair.length === 2 ? (
                                        <td className="w-0 p-0" /> // spacer
                                      ) : null}
                                    </tr>
                                  ))}
                                  <tr className="h-2" />
                                </Fragment>
                              );
                            }

                            const isKhado = fancyTab === "khado";

                            return (
                              <Fragment key={mid || marketLabel(m)}>
                                {isKhado ? (
                                  <>
                                    <tr className="bet-all">
                                      <th className="th-col align-l" colSpan={7}>
                                        <div className="flex items-center gap-2 py-1">
                                          <span className="text-[11px] font-bold uppercase text-zinc-700 dark:text-zinc-300">
                                            {marketLabel(m)}
                                          </span>
                                          <div className="flex items-center gap-1.5 opacity-60">
                                            <RefreshCw className="h-3 w-3" />
                                            <BarChart3 className="h-3 w-3" />
                                          </div>
                                        </div>
                                      </th>
                                    </tr>
                                    <tr className="tr-data even">
                                      <th className="match-title !bg-zinc-50/50 dark:!bg-zinc-900/50" scope="row">
                                        <MatchTitleCell
                                          name={rname}
                                          exposurePl={fancyExposurePl}
                                        />
                                      </th>
                                      <td className="lay-3 align-c p-1">
                                        <ScorePriceButton level={EMPTY_LEVEL} isLay />
                                      </td>
                                      <td className="lay-2 align-c p-1">
                                        <ScorePriceButton level={EMPTY_LEVEL} isLay />
                                      </td>
                                      {showBall ? (
                                        <>
                                          <td colSpan={4} className="sb-ball-running">
                                            BALL RUNNING
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="lay-1 align-c p-1">
                                            <ScorePriceButton level={lay} isLay />
                                          </td>
                                          <td className="back-1 align-c p-1">
                                            <ScorePriceButton level={back} />
                                          </td>
                                          <td className="back-2 align-c p-1">
                                            <ScorePriceButton level={EMPTY_LEVEL} />
                                          </td>
                                          <td className="back-3 align-c p-1">
                                            <ScorePriceButton level={EMPTY_LEVEL} />
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                    <tr className="h-2" />
                                  </>
                                ) : (
                                  <tr className={`tr-data ${rowIdx % 2 === 0 ? "odd" : "even"}`}>
                                    <th className="match-title" scope="row">
                                      <MatchTitleCell
                                        name={marketLabel(m)}
                                        exposurePl={fancyExposurePl}
                                      />
                                    </th>
                                    <td className="lay-3 align-c p-1">
                                      <ScorePriceButton level={EMPTY_LEVEL} isLay />
                                    </td>
                                    <td className="lay-2 align-c p-1">
                                      <ScorePriceButton level={EMPTY_LEVEL} isLay />
                                    </td>
                                    {showBall ? (
                                      <>
                                        <td colSpan={4} className="sb-ball-running">
                                          BALL RUNNING
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="lay-1 align-c p-1">
                                          <ScorePriceButton level={lay} isLay />
                                        </td>
                                        <td className="back-1 align-c p-1">
                                          <ScorePriceButton level={back} />
                                        </td>
                                        <td className="back-2 align-c p-1">
                                          <ScorePriceButton level={EMPTY_LEVEL} />
                                        </td>
                                        <td className="back-3 align-c p-1">
                                          <ScorePriceButton level={EMPTY_LEVEL} />
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>

          <aside className="w-full shrink-0 space-y-3 lg:max-w-md lg:border-l lg:border-border lg:pl-6">
            <div className="rounded-lg border border-border bg-surface-muted/40 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-tertiary">
                Live bets
              </p>
              <div className="space-y-2">
                <label className="block text-xs text-foreground-secondary">
                  Market
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                    value={selectedMarketId}
                    onChange={(e) => setSelectedMarketId(e.target.value)}
                    disabled={!eventId.trim()}
                  >
                    <option value="">All markets</option>
                    {(eventRow?.markets ?? [])
                      .filter((m) => m.id != null && String(m.id).trim())
                      .map((m) => (
                        <option key={String(m.id)} value={String(m.id)}>
                          {marketLabel(m)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-xs text-foreground-secondary">
                  Status
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                    value={betStatusFilter}
                    onChange={(e) =>
                      setBetStatusFilter(e.target.value as "" | "matched" | "unmatched")
                    }
                  >
                    <option value="">All</option>
                    <option value="matched">Matched</option>
                    <option value="unmatched">Unmatched</option>
                  </select>
                </label>
                <label className="block text-xs text-foreground-secondary">
                  Side
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
                    value={betSideFilter}
                    onChange={(e) => setBetSideFilter(e.target.value)}
                  >
                    <option value="-1">All</option>
                    <option value="1">Back</option>
                    <option value="2">Lay</option>
                  </select>
                </label>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  className="flex-1"
                  onClick={() => loadEventBets()}
                  disabled={betsLoading || !eventId.trim()}
                >
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="flex-1"
                  onClick={() => {
                    setBetStatusFilter("matched");
                    setBetSideFilter("-1");
                    setSelectedMarketId("");
                  }}
                >
                  Reset
                </Button>
              </div>
              {betTotal > 0 ? (
                <p className="mt-2 text-xs text-foreground-tertiary">
                  {betStatusFilter === "matched"
                    ? `${betTotal} matched bet${betTotal === 1 ? "" : "s"} found`
                    : `Showing ${betRows.length} of ${betTotal} (first page).`}
                </p>
              ) : null}
            </div>
            {betsError ? (
              <p className="text-sm text-error" role="alert">
                {betsError}
              </p>
            ) : null}
            {betsLoading ? (
              <p className="text-xs text-muted">Loading…</p>
            ) : betRows.length === 0 ? (
              <p className="rounded-md border border-border bg-surface px-3 py-8 text-center text-xs text-muted">
                {!eventId.trim()
                  ? "Open this page from Website analytics with a valid event."
                  : "No records for selected filters."}
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {betRows.map((row, i) => {
                  const r = row as Record<string, unknown>;
                  const pageEventName = String(
                    eventRow?.name ?? eventRow?.raceName ?? "",
                  ).trim();
                  const { eventName, marketName } = liveBetEventAndMarketNames(r);
                  const runner = String(r.runnerName ?? "").trim();
                  const cardTitle = eventMarketTitle(
                    runner || eventName || pageEventName,
                    marketName,
                  );
                  const member = liveBetMemberName(r);
                  const cardDate = formatBetCardDateTime(
                    r.createdOn ?? r.updatedOn ?? r.createdAt,
                  );
                  const betId = liveBetIdDisplay(r);
                  const linePrice = Number(r.price);
                  const priceStr =
                    Number.isFinite(linePrice) && linePrice !== 0
                      ? formatOddsPrice(linePrice)
                      : "—";
                  const stakeRaw = liveBetStakeForDisplay(r);
                  const stakeN = Number(stakeRaw ?? 0);
                  const avgStr = liveBetAvgDisplay(r);
                  const side = Number(r.side ?? 1);
                  return (
                    <BetCard
                      key={String(row.id ?? row.roundId ?? row.betId ?? i)}
                      title={cardTitle}
                      user={member}
                      date={cardDate}
                      betId={betId}
                      price={priceStr}
                      size={stakeN}
                      avg={avgStr}
                      side={side}
                    />
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      </ListPageFrame>
    </div>
  );
}
