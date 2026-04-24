"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import {
  PageHeader,
  ListPageFrame,
  Button,
  Input,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components";
import { getEventType, type EventTypeRecord } from "@/services/eventtype.service";
import {
  getMarketByEventTypeId,
  type MarketByEventRow,
} from "@/services/position.service";
import { getLiveBets } from "@/services/bet.service";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import {
  coerceAmount,
  collectMatchOddsMarketIds,
  findMatchOddsMarket,
  formatLiquidity,
  formatOddsPrice,
  getDisplayCurrencyRate,
  lookupRunnerBook,
  normalizePriceLevel,
  partitionMatchOddsRunners,
  useWebsitePriceBookWs,
  type WsMarketBookPayload,
  type WsRunnerBookRow,
} from "./_lib/websitePriceBook";
import {
  liveBetEventId,
  liveBetStakeForDisplay,
} from "./_lib/liveBetDisplay";

/** Sum matched bet stakes per event (same units as bet card “Size”). */
function sumMatchedStakesByEventId(
  rows: Record<string, unknown>[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const eid = liveBetEventId(row);
    if (!eid) continue;
    const n = coerceAmount(liveBetStakeForDisplay(row));
    if (n == null || n <= 0) continue;
    map.set(eid, (map.get(eid) ?? 0) + n);
  }
  return map;
}

function tradedStakeForEventRow(
  sumByEventId: Map<string, number>,
  ev: MarketByEventRow,
  eventIdStr: string,
): number {
  const sourceId = pickStr(ev as Record<string, unknown>, ["sourceId"]);
  for (const k of [eventIdStr, sourceId ?? ""].filter((x) => x.trim())) {
    const v = sumByEventId.get(k);
    if (v != null && v > 0) return v;
  }
  if (eventIdStr.trim()) return sumByEventId.get(eventIdStr) ?? 0;
  return 0;
}

type TradedStatSource = "bets" | "none";

function readBetCount(ev: MarketByEventRow): number {
  const o = ev as Record<string, unknown>;
  const keys = ["totalBets", "totalBet", "betCount", "betsCount", "bets"];
  for (const k of keys) {
    const n = coerceAmount(o[k]);
    if (n != null && n >= 0) return Math.floor(n);
  }
  return 0;
}

function OddsStack({ runnerBook }: { runnerBook?: WsRunnerBookRow }) {
  const rate = getDisplayCurrencyRate();
  const back = normalizePriceLevel(runnerBook?.bp?.[0]);
  const lay = normalizePriceLevel(runnerBook?.lp?.[0]);
  const backStr = formatOddsPrice(back.price);
  const layStr = formatOddsPrice(lay.price);
  const bVol = formatLiquidity(
    back.size != null ? back.size * rate : undefined,
  );
  const lVol = formatLiquidity(lay.size != null ? lay.size * rate : undefined);
  const cell = (
    label: string,
    priceStr: string,
    vol: string,
    sky: boolean,
  ) => (
    <div
      className={`flex min-w-0 flex-1 flex-col rounded-md border px-1.5 py-1 text-center leading-tight ${
        sky
          ? "border-sky-200/80 bg-sky-100 dark:border-sky-800 dark:bg-sky-950/55"
          : "border-rose-200/80 bg-rose-100 dark:border-rose-800 dark:bg-rose-950/55"
      }`}
    >
      <div
        className={`text-[9px] font-bold uppercase tracking-wide ${
          sky
            ? "text-sky-800/90 dark:text-sky-200/90"
            : "text-rose-800/90 dark:text-rose-200/90"
        }`}
      >
        {label}
      </div>
      <div className="tabular-nums text-[13px] font-bold text-foreground">
        {priceStr}
      </div>
      {vol ? (
        <div
          className={`mt-0.5 text-[11px] font-semibold tabular-nums ${
            sky
              ? "text-sky-900/90 dark:text-sky-100/90"
              : "text-rose-900/90 dark:text-rose-100/90"
          }`}
        >
          {vol}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex min-w-[7.5rem] items-stretch justify-center gap-1.5 text-xs tabular-nums">
      {cell("Back", backStr, bVol, true)}
      {cell("Lay", layStr, lVol, false)}
    </div>
  );
}

/** Match-odds style tiles: bet count + traded volume. */
function BetsTradedStatTiles({
  bets,
  traded,
}: {
  bets: number;
  traded: { amount: number; source: TradedStatSource };
}) {
  const tradedClass = signedAmountTextClass(Number(traded.amount ?? 0));

  return (
    <div className="flex flex-wrap items-stretch gap-1.5">
      <div
        className="flex min-w-[4.25rem] flex-col rounded-md border border-sky-200/80 bg-sky-100 px-2 py-1 text-center leading-tight dark:border-sky-800 dark:bg-sky-950/55"
        title="Bet count"
      >
        <div className="text-[9px] font-bold uppercase tracking-wide text-sky-800/90 dark:text-sky-200/90">
          Bets
        </div>
        <div className="tabular-nums text-[13px] font-bold text-foreground">
          {bets}
        </div>
      </div>
      <div
        className="flex min-w-[5.5rem] flex-col rounded-md border border-emerald-200/80 bg-emerald-100 px-2 py-1 text-center leading-tight dark:border-emerald-800 dark:bg-emerald-950/55"
        title={
          traded.source === "bets"
            ? "Total matched stake for this event (same as bet Size, e.g. ₹100)"
            : "No matched stakes in loaded live bets for this event"
        }
      >
        <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-800/90 dark:text-emerald-200/90">
          Traded
        </div>
        <div className={`tabular-nums text-[13px] font-bold ${tradedClass}`}>
          {formatCurrency(traded.amount)}
        </div>
      </div>
    </div>
  );
}

function RunnerOddsCell({
  runnerBook,
  runnerLabel,
  isUnavailable,
}: {
  runnerBook?: WsRunnerBookRow;
  runnerLabel: string;
  isUnavailable?: boolean;
}) {
  if (isUnavailable) {
    return (
      <div className="flex min-h-[5.5rem] flex-col items-center justify-center gap-1 px-2 py-2 text-center">
        <span className="text-sm text-muted-foreground">—</span>
        <span className="max-w-[9rem] truncate text-[11px] text-foreground-tertiary">
          {runnerLabel}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-2">
      <OddsStack runnerBook={runnerBook} />
      <span
        className="max-w-[9rem] truncate text-center text-[11px] font-medium leading-snug text-foreground-secondary"
        title={runnerLabel}
      >
        {runnerLabel}
      </span>
    </div>
  );
}

function pickStr(r: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function eventTypeMeta(et: EventTypeRecord): { id: string; label: string } | null {
  if (!et || typeof et !== "object") return null;
  const o = et as Record<string, unknown>;
  const id = pickStr(o, ["id", "_id"]);
  const name = pickStr(o, ["name", "eventTypeName", "sportName"]);
  if (!id || !name) return null;
  return { id, label: name };
}

type SportTab = { id: string; label: string };

function buildSportTabs(list: EventTypeRecord[]): SportTab[] {
  const metas = list.map(eventTypeMeta).filter(Boolean) as SportTab[];
  const score = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes("cricket")) return 0;
    if (l.includes("football") || l.includes("soccer")) return 1;
    if (l.includes("tennis")) return 2;
    return 99;
  };
  const preferred = metas
    .filter((m) => score(m.label) < 99)
    .sort((a, b) => score(a.label) - score(b.label));
  const tabs: SportTab[] = [{ id: "-1", label: "All sports" }];
  const seen = new Set(tabs.map((t) => t.id));
  for (const p of preferred) {
    if (!seen.has(p.id)) {
      tabs.push(p);
      seen.add(p.id);
    }
  }
  if (tabs.length <= 1) {
    for (const m of metas) {
      if (!seen.has(m.id)) {
        tabs.push(m);
        seen.add(m.id);
      }
      if (tabs.length >= 4) break;
    }
  }
  return tabs;
}

export default function WebsiteAnalyticsPage() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<SportTab[]>([]);
  const [activeSportId, setActiveSportId] = useState<string>("-1");
  const [showAllEvents, setShowAllEvents] = useState(true);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState<string | null>(null);
  const [marketRows, setMarketRows] = useState<MarketByEventRow[]>([]);

  const [betsLoading, setBetsLoading] = useState(true);
  const [betsError, setBetsError] = useState<string | null>(null);
  const [liveBetRows, setLiveBetRows] = useState<Record<string, unknown>[]>([]);
  const [liveBetTotal, setLiveBetTotal] = useState(0);

  const [refreshKey, setRefreshKey] = useState(0);

  const matchOddsMarketIds = useMemo(
    () => collectMatchOddsMarketIds(marketRows),
    [marketRows],
  );
  const { priceBooks, wsConnected, wsAuthed, wsNote } = useWebsitePriceBookWs({
    marketIds: matchOddsMarketIds,
    onRefreshSignal: () => setRefreshKey((k) => k + 1),
  });

  useEffect(() => {
    getEventType()
      .then((list) =>
        setEventTypes(buildSportTabs(Array.isArray(list) ? list : [])),
      )
      .catch(() => setEventTypes([{ id: "-1", label: "All sports" }]));
  }, []);

  const filteredEvents = useMemo(() => {
    if (showAllEvents) return marketRows;
    return marketRows.filter((ev) => {
      const m = findMatchOddsMarket(ev);
      return Boolean(m?.inPlay);
    });
  }, [marketRows, showAllEvents]);

  const loadMarkets = useCallback(() => {
    setMarketsLoading(true);
    setMarketsError(null);
    getMarketByEventTypeId(activeSportId, true)
      .then((rows) => setMarketRows(rows))
      .catch((e) => {
        setMarketRows([]);
        setMarketsError(e instanceof Error ? e.message : "Failed to load markets.");
      })
      .finally(() => setMarketsLoading(false));
  }, [activeSportId, refreshKey]);

  const loadLiveBets = useCallback(() => {
    setBetsLoading(true);
    setBetsError(null);
    const eventTypeId = activeSportId === "-1" ? "" : activeSportId;
    getLiveBets(
      {
        page: 1,
        pageSize: 500,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { eventTypeId, status: "matched" },
    )
      .then((res) => {
        setLiveBetRows(res.items);
        setLiveBetTotal(res.total);
      })
      .catch((e) => {
        setLiveBetRows([]);
        setLiveBetTotal(0);
        setBetsError(e instanceof Error ? e.message : "Failed to load live bets.");
      })
      .finally(() => setBetsLoading(false));
  }, [activeSportId, refreshKey]);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  useEffect(() => {
    loadLiveBets();
  }, [loadLiveBets]);

  const emptyFilterMsg =
    !marketsLoading &&
    marketRows.length > 0 &&
    filteredEvents.length === 0 &&
    !showAllEvents;

  const matchedStakeByEventId = useMemo(
    () => sumMatchedStakesByEventId(liveBetRows),
    [liveBetRows],
  );

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="Website | Analytics"
        breadcrumbs={["Website", "Analytics"]}
        action={
          <Button
            variant="outline"
            size="sm"
            type="button"
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refresh
          </Button>
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
            ? "Live updates: connected."
            : wsConnected
              ? "WebSocket connected; authenticating…"
              : "WebSocket offline — REST refresh only."}
          {wsNote ? ` ${wsNote}` : null}
        </span>
      </div>

      <ListPageFrame>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1 rounded-lg bg-surface-muted/60 p-1">
              {eventTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveSportId(t.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeSportId === t.id
                      ? "bg-surface text-foreground shadow-sm"
                      : "text-foreground-secondary hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Input
                type="checkbox"
                checked={showAllEvents}
                onChange={(e) => setShowAllEvents(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Show all events
            </label>
          </div>

          {marketsError && (
            <p className="text-sm text-error" role="alert">
              {marketsError}
            </p>
          )}
          {emptyFilterMsg && (
            <p className="text-sm text-foreground-secondary">
              No in-play events for this sport. Turn on &quot;Show all events&quot; or pick
              another tab.
            </p>
          )}

          <div className="rounded-lg">
            <Table className="min-w-[720px] table-fixed">
              <colgroup>
                <col className="w-[min(36%,28rem)]" />
                <col className="w-[21%]" />
                <col className="w-[21%]" />
                <col className="w-[21%]" />
              </colgroup>
              <TableHeader>
                <TableHead className="align-bottom">Markets</TableHead>
                <TableHead className="border-l text-center">1</TableHead>
                <TableHead className="border-l text-center">X</TableHead>
                <TableHead className="border-l text-center">2</TableHead>
              </TableHeader>
              <TableBody>
                {marketsLoading ? (
                  <TableEmpty colSpan={4} message="Loading markets…" />
                ) : filteredEvents.length === 0 ? (
                  <TableEmpty
                    colSpan={4}
                    message={
                      marketRows.length === 0
                        ? "No markets for this sport. Try another tab or refresh."
                        : "No events match the current filter. Turn on “Show all events” or pick another tab."
                    }
                  />
                ) : (
                  filteredEvents.map((ev) => {
                    const market = findMatchOddsMarket(ev);
                    const marketId =
                      market?.id != null ? String(market.id) : undefined;
                    const wsBook = marketId ? priceBooks[marketId] : undefined;
                    const { col1, colX, col2 } = partitionMatchOddsRunners(
                      market?.marketRunner,
                    );
                    const rid1 = col1?.entry?.runner?.id;
                    const ridX = colX?.entry?.runner?.id;
                    const rid2 = col2?.entry?.runner?.id;
                    const book1 = lookupRunnerBook(priceBooks, marketId, rid1);
                    const bookX = lookupRunnerBook(priceBooks, marketId, ridX);
                    const book2 = lookupRunnerBook(priceBooks, marketId, rid2);
                    const inPlay =
                      wsBook?.ip !== undefined
                        ? Boolean(wsBook.ip)
                        : Boolean(market?.inPlay);
                    const title = String(ev.name ?? ev.raceName ?? "—");
                    const when = ev.openDate ? formatDateTime(ev.openDate) : "—";
                    const bets = readBetCount(ev);
                    const eventIdStr =
                      ev.id != null && String(ev.id).trim()
                        ? String(ev.id).trim()
                        : pickStr(ev as Record<string, unknown>, [
                            "eventId",
                            "_id",
                          ]) ?? "";
                    const tradedTotal = tradedStakeForEventRow(
                      matchedStakeByEventId,
                      ev,
                      eventIdStr,
                    );
                    const traded = {
                      amount: tradedTotal,
                      source: (tradedTotal > 0 ? "bets" : "none") as TradedStatSource,
                    };
                    const canOpenEvent = Boolean(eventIdStr);
                    const openEventDetail = () => {
                      if (!eventIdStr) return;
                      router.push(
                        `/website/analytics/event/${encodeURIComponent(eventIdStr)}?eventTypeId=${encodeURIComponent(activeSportId)}`,
                      );
                    };

                    return (
                      <TableRow
                        key={String(ev.id ?? title)}
                        className={canOpenEvent ? "cursor-pointer" : undefined}
                        onClick={canOpenEvent ? openEventDetail : undefined}
                        onKeyDown={
                          canOpenEvent
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openEventDetail();
                                }
                              }
                            : undefined
                        }
                        tabIndex={canOpenEvent ? 0 : undefined}
                        aria-label={
                          canOpenEvent
                            ? `Open market view for ${title}`
                            : undefined
                        }
                      >
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="font-medium leading-snug text-foreground">
                                {title}
                              </div>
                              <div className="text-xs text-foreground-secondary">
                                {when}
                              </div>
                              <BetsTradedStatTiles bets={bets} traded={traded} />
                            </div>
                            {inPlay ? (
                              <div className="flex shrink-0 items-center gap-1 self-start rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                                In play
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="border-l p-0 align-top">
                          <RunnerOddsCell
                            runnerBook={book1}
                            runnerLabel={col1?.name ?? "—"}
                          />
                        </TableCell>
                        <TableCell className="border-l p-0 align-top">
                          <RunnerOddsCell
                            runnerBook={colX ? bookX : undefined}
                            runnerLabel={colX?.name ?? "—"}
                            isUnavailable={!colX}
                          />
                        </TableCell>
                        <TableCell className="border-l p-0 align-top">
                          <RunnerOddsCell
                            runnerBook={book2}
                            runnerLabel={col2?.name ?? "—"}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-tertiary">
              Live bets
            </h2>
            {betsError && (
              <p className="text-sm text-error" role="alert">
                {betsError}
              </p>
            )}
            <div className="rounded-lg">
              <Table>
                <TableHeader>
                  <TableHead>Event</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead >Stake</TableHead>
                  <TableHead >Odds</TableHead>
                </TableHeader>
                <TableBody>
                  {betsLoading ? (
                    <TableEmpty colSpan={4} message="Loading live bets…" />
                  ) : liveBetRows.length === 0 ? (
                    <TableEmpty
                      colSpan={4}
                      message={
                        liveBetTotal === 0
                          ? "No live bets for this filter (POST /bet/getlivebets)."
                          : "No rows on this page."
                      }
                    />
                  ) : (
                    liveBetRows.map((row, i) => {
                      const r = row as Record<string, unknown>;
                      const event =
                        pickStr(r, ["eventName", "raceName", "name"]) ?? "—";
                      const mkt = pickStr(r, ["marketName", "market"]) ?? "—";
                      const stake = r.stake ?? r.betStake;
                      const stakeN = Number(stake ?? 0);
                      const odds = r.odds ?? r.price ?? r.matchOdd;
                      return (
                        <TableRow key={pickStr(r, ["id", "betId"]) ?? i}>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {event}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate text-sm">
                            {mkt}
                          </TableCell>
                          <TableCell  className={`tabular-nums text-sm ${signedAmountTextClass(stakeN)}`}>
                            {formatCurrency(stake ?? 0)}
                          </TableCell>
                          <TableCell  className="tabular-nums text-sm">
                            {odds != null ? String(odds) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            {!betsLoading && liveBetTotal > liveBetRows.length ? (
              <p className="text-xs text-foreground-secondary">
                Showing {liveBetRows.length} of {liveBetTotal}. Open
                <Link href="/sports/betlist" className="text-primary underline">
                  Sports betlist
                </Link>
                for full filters.
              </p>
            ) : null}
          </div> */}
        </div>
      </ListPageFrame>
    </div>
  );
}
