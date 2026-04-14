"use client";

import "./scoreboard-table.css";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  PageHeader,
  ListPageFrame,
  Button,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components";
import { getLiveBetsByEventId } from "@/services/bet.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";
import { getOtherMarketsByEventAndMatchOddsId } from "@/services/marketodds.service";
import {
  getMarketByEventTypeId,
  getMarketCatalogByMarketId,
  mergeMarketCatalogForEvent,
  mergeMarketsIntoEvent,
  type MarketByEventMarket,
  type MarketByEventRow,
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
} from "../../_lib/websitePriceBook";

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

function tabKeyForMarket(
  m: MarketByEventMarket, 
): "fancy" | "line" | "winning" | "khado" {
  const t = normalizeMarketTypeKey(m);
  const n = String(m.name ?? "").toLowerCase();
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
      <th className="th-col align-l">
        <span className="sb-market-title">{title}</span>
        <div className="sb-market-icons">
          <span className="text-red-600">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="text-zinc-800 dark:text-zinc-200">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </th>
      <th className="sb-head-spacer" colSpan={2} />
      <td className="sb-head-mid align-r font-bold" />
      <td className="sb-head-mid align-l font-bold" />
      <th className="sb-head-spacer" colSpan={2} />
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

/** Live site: bold price on top, size / % smaller below — same for Back and Lay. */
function ScorePriceButton({
  level,
}: {
  level: { price?: number; size?: number; percentage?: number };
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
    <button type="button" className={sub ? "price" : "price onlyprice"}>
      <span className="block tabular-nums sb-odds-price">{priceStr}</span>
      {sub ? (
        <span
          className={`size block tabular-nums${hasPct ? " percentage" : ""}`}
        >
          {sub}
        </span>
      ) : null}
    </button>
  );
}

function ToggleRow({ label, value }: { label: string; value: "YES" | "NO" }) {
  const on = value === "YES";
  return (
    <div className="flex items-center gap-2 text-xs text-foreground-secondary">
      <span className="max-w-[10rem] leading-tight">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
          on
            ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-200"
            : "bg-surface-muted text-foreground-tertiary"
        }`}
      >
        {value}
      </span>
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
}: {
  name: string;
  runnerBook?: WsRunnerBookRow;
  stripe?: "even" | "odd";
  variant: "exchange" | "bookmaker-full" | "bookmaker-center";
  market?: MarketByEventMarket;
}) {
  const backs = bestBackLevels(runnerBook, 3);
  const lays = bestLayLevels(runnerBook, 3);
  const backsDisplay = [...backs].reverse();
  const laysForColumns = lays;
  const hasBook =
    backs.some((b) => hasFinitePrice(b)) ||
    lays.some((l) => hasFinitePrice(l));
  const apiBall = isBallRunningMarket(market);
  const zebra = stripe === "even" ? "even" : stripe === "odd" ? "odd" : "";

  if (apiBall || !hasBook) {
    return (
      <tr className={`tr-data ${zebra}`}>
        <th className="match-title" scope="row">
          <p>{name}</p>
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
            <p>{name}</p>
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
          <p>{name}</p>
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
        <p>{name}</p>
      </th>
      {backsDisplay.map((lvl, i) => (
        <td
          key={`b-${i}`}
          className={
            hasFinitePrice(lvl)
              ? `back-${3 - i} align-c`
              : "sb-odds-neutral align-c"
          }
        >
          <ScorePriceButton level={lvl} />
        </td>
      ))}
      {laysForColumns.map((lvl, i) => (
        <td
          key={`l-${i}`}
          className={
            hasFinitePrice(lvl)
              ? `lay-${i + 1} align-c`
              : "sb-odds-neutral align-c"
          }
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
  const { priceBooks, wsConnected, wsAuthed, wsNote } = useWebsitePriceBookWs({
    marketIds,
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
                  <ToggleRow label="Event Bet Locked?" value="NO" />
                  <ToggleRow label="Include PT?" value="NO" />
                </div>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-foreground-secondary">Loading event…</p>
            ) : !eventRow ? null : (
              <>
                {matchMarket && matchMarketId ? (
                  <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30">
                    <div className="overflow-x-auto">
                      <table className="table-score">
                        <tbody>
                          <ScoreboardBetAllRow title="Match Odds" />
                          <ScoreboardBackLayLabelRow />
                          {(matchMarket.marketRunner ?? []).map((entry, rowIdx) => {
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
                          <tbody>
                            <ScoreboardBetAllRow title={marketLabel(m)} />
                            <ScoreboardBackLayLabelRow />
                            {(m.marketRunner ?? []).map((entry, rowIdx) => {
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
                  .filter((m) => m.id != null && String(m.id).trim())
                  .map((m) => {
                  const mid = String(m.id);
                  return (
                    <section
                      key={mid}
                      className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950/30"
                    >
                      <div className="overflow-x-auto">
                        <table className="table-score">
                          <tbody>
                            <ScoreboardBetAllRow title={marketLabel(m)} />
                            <ScoreboardBackLayLabelRow />
                            {(m.marketRunner ?? []).map((entry, rowIdx) => {
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
                          <tbody>
                            <ScoreboardBetAllRow title={marketLabel(m)} />
                            <ScoreboardBackLayLabelRow />
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
                      No{" "}
                      {fancyTab === "fancy"
                        ? "fancy"
                        : fancyTab === "line"
                          ? "line"
                          : fancyTab === "winning"
                            ? "winning"
                            : "khado"}{" "}
                      markets for this event.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table-score">
                        <tbody>
                          <tr className="sb-back-lay-labels">
                            <th className="sb-corner" scope="row">
                              Market
                            </th>
                            <th
                              colSpan={3}
                              className="text-center text-[10px] font-bold uppercase tracking-wider"
                            >
                              Lay
                            </th>
                            <th
                              colSpan={3}
                              className="text-center text-[10px] font-bold uppercase tracking-wider"
                            >
                              Back
                            </th>
                          </tr>
                          {tabMarkets.map((m, rowIdx) => {
                            const mid = m.id != null ? String(m.id) : "";
                            const runner = m.marketRunner?.[0];
                            const rid = runner?.runner?.id;
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
                            const stripe =
                              rowIdx % 2 === 0 ? "odd" : "even";
                            const iconCell = (
                              <td className="sb-odds-neutral align-c">
                                <div className="flex items-center justify-center gap-1.5 py-1 text-zinc-500 dark:text-zinc-400">
                                  <RefreshCw
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                  />
                                  <BarChart3
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                  />
                                </div>
                              </td>
                            );
                            return (
                              <tr
                                key={mid || marketLabel(m)}
                                className={`tr-data ${stripe}`}
                              >
                                <th className="match-title" scope="row">
                                  <p>{marketLabel(m)}</p>
                                </th>
                                <td className="sb-odds-neutral align-c">
                                  <ScorePriceButton level={EMPTY_LEVEL} />
                                </td>
                                {showBall ? (
                                  <>
                                    <td colSpan={4} className="sb-ball-running">
                                      BALL RUNNING
                                    </td>
                                    {iconCell}
                                  </>
                                ) : (
                                  <>
                                    <td className="sb-odds-neutral align-c">
                                      <ScorePriceButton level={EMPTY_LEVEL} />
                                    </td>
                                    <td className="lay-1 align-c">
                                      <ScorePriceButton level={lay} />
                                    </td>
                                    <td className="back-1 align-c">
                                      <ScorePriceButton level={back} />
                                    </td>
                                    <td className="sb-odds-neutral align-c">
                                      <ScorePriceButton level={EMPTY_LEVEL} />
                                    </td>
                                    {iconCell}
                                  </>
                                )}
                              </tr>
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
                  Showing {betRows.length} of {betTotal} (first page).
                </p>
              ) : null}
            </div>
            {betsError ? (
              <p className="text-sm text-error" role="alert">
                {betsError}
              </p>
            ) : null}
            <div className="overflow-x-auto rounded-md border border-border bg-surface">
              <Table className="min-w-[22rem] text-xs">
                <TableHeader className="bg-surface-muted/60">
                  <TableHead className="font-semibold">Selection</TableHead>
                  <TableHead className="text-right font-semibold">Stake</TableHead>
                  <TableHead className="text-right font-semibold">Odds</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Time</TableHead>
                </TableHeader>
                <TableBody>
                  {betsLoading ? (
                    <TableEmpty colSpan={5} message="Loading…" />
                  ) : betRows.length === 0 ? (
                    <TableEmpty
                      colSpan={5}
                      message={
                        !eventId.trim()
                          ? "Open this page from Website analytics with a valid event."
                          : "No records for selected filters."
                      }
                    />
                  ) : (
                    betRows.map((row, i) => (
                      <TableRow
                        key={String(row.id ?? row.roundId ?? row.betId ?? i)}
                      >
                        <TableCell className="max-w-[9rem] truncate">
                          {String(row.selection ?? row.runnerName ?? "—")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(row.stake)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {String(row.odds ?? "—")}
                        </TableCell>
                        <TableCell>{String(row.status ?? "—")}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(row.createdAt ?? row.createdon ?? row.date)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </aside>
        </div>
      </ListPageFrame>
    </div>
  );
}
