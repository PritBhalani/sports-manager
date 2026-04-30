"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlayCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Trophy,
  CircleDot,
  Landmark,
  Dice5,
  Gamepad2,
  Users,
  Dog,
  HandMetal,
  Target,
  Timer
} from "lucide-react";
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
  getEventTypePosition,
  type MarketByEventRow
} from "@/services/position.service";
import { getLiveBets } from "@/services/bet.service";
import { formatDateTime } from "@/utils/date";
import { formatCurrency } from "@/utils/formatCurrency";
import { signedAmountTextClass } from "@/utils/signedAmountTextClass";
import { apiConfig } from "@/config/api.config";
import { BetCard } from "@/app/(dashboard)/website/analytics/_lib/BetCard";
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
  liveBetEventAndMarketNames,
  eventMarketTitle,
  liveBetMemberName,
  formatBetCardDateTime,
  liveBetIdDisplay,
  liveBetAvgDisplay,
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

function OddsStack({ runnerBook, inPlay }: { runnerBook?: WsRunnerBookRow; inPlay?: boolean }) {
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
    priceStr: string,
    vol: string,
    sky: boolean,
    label: string
  ) => (
    <div
      className={`flex min-w-[3rem] flex-1 flex-col items-center justify-center rounded-[4px] py-1 text-center leading-none transition-all hover:brightness-95 ${sky
          ? "bg-sky-50 dark:bg-sky-950/30"
          : "bg-rose-50 dark:bg-rose-950/30"
        }`}
    >
      <span className={`mb-0.5 text-[8px] font-bold uppercase tracking-tighter ${sky ? "text-sky-500" : "text-rose-500"}`}>
        {label}
      </span>
      <div className="tabular-nums text-[13px] font-bold text-zinc-900 dark:text-zinc-50">
        {priceStr}
      </div>
      {vol ? (
        <div className="mt-0.5 text-[9px] font-medium tabular-nums text-zinc-400 dark:text-zinc-500">
          {vol}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1.5 py-3">
      <div className="flex w-full items-stretch gap-1.5 px-3">
        {cell(backStr, bVol, true, "BACK")}
        {cell(layStr, lVol, false, "LAY")}
      </div>
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">RUNS</span>
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
  const rate = getDisplayCurrencyRate();
  const displayTraded = Math.round(traded.amount * rate);
  const tradedClass = signedAmountTextClass(displayTraded);

  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-md bg-sky-100 px-2.5 py-1 dark:bg-sky-950/40">
        <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300">BETS</span>
        <span className="text-sm font-bold text-sky-900 dark:text-sky-100">{bets}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1 dark:bg-emerald-950/40">
        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">TRADED</span>
        <span className={`text-sm font-bold ${tradedClass}`}>
          {displayTraded.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function RunnerOddsCell({
  runnerBook,
  inPlay,
}: {
  runnerBook?: WsRunnerBookRow;
  inPlay?: boolean;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <OddsStack runnerBook={runnerBook} inPlay={inPlay} />
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

function BetCardPlaceholder() {
  return (
    <BetCard
      title="RUNS || NDA ALLIANCE TOTAL SEATS IN ASSAM"
      user="tapan14"
      date="26 Apr, 10:38:32"
      price="101"
      size={100}
      avg="101"
      betId="69ed9dd1dd59e7bbdbb6030f"
    />
  );
}

function eventTypeMeta(et: EventTypeRecord): (SportTab & { isActive?: boolean; displayOrder?: number }) | null {
  if (!et || typeof et !== "object") return null;
  const o = et as Record<string, unknown>;
  const id = pickStr(o, ["id", "_id"]);
  const name = pickStr(o, ["name", "label", "eventTypeName", "sportName"]);
  if (!id || !name) return null;
  return {
    id,
    label: name,
    isActive: o.isActive === true,
    displayOrder: typeof o.displayOrder === "number" ? o.displayOrder : undefined
  };
}

type SportTab = {
  id: string;
  label: string;
  pl?: number;
  hasBet?: boolean;
  marketCount?: number;
  icon?: string;
};

function getSportIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("cricket")) return Trophy;
  if (n.includes("football") || n.includes("soccer")) return CircleDot;
  if (n.includes("tennis")) return CircleDot;
  if (n.includes("politics")) return Landmark;
  if (n.includes("casino")) return Dice5;
  if (n.includes("session")) return Gamepad2;
  if (n.includes("horse")) return Timer;
  if (n.includes("greyhound") || n.includes("dog")) return Dog;
  if (n.includes("kabaddi")) return HandMetal;
  return Target;
}

function buildSportTabs(list: any[]): SportTab[] {
  const tabs: SportTab[] = [];
  const seen = new Set<string>();

  // Sort by displayOrder
  const sorted = [...list].sort((a, b) => {
    const orderA = a.displayOrder ?? 999;
    const orderB = b.displayOrder ?? 999;
    const valA = orderA === -1 ? 998 : orderA;
    const valB = orderB === -1 ? 998 : orderB;
    return valA - valB;
  });

  for (const s of sorted) {
    if (!s.isActive || !s.id || seen.has(s.id)) continue;
    if (String(s.name ?? "").toLowerCase().includes("all sport")) continue;

    // Requirement: only show if markets have data
    if (!s.markets || s.markets.length === 0) continue;

    // Check if any market has a bet
    const hasBet = s.markets?.some((m: any) => m.hasBet) || (s.pl !== 0);

    tabs.push({
      id: s.id,
      label: s.name || "Unknown",
      pl: s.pl,
      hasBet,
      marketCount: s.markets.length
    });
    seen.add(s.id);
  }

  return tabs;
}

export default function WebsiteAnalyticsPage() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<SportTab[]>([]);
  const [activeSportId, setActiveSportId] = useState<string>("");
  const [showAllEvents, setShowAllEvents] = useState(false);
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

  const loadEventTypes = useCallback(async () => {
    try {
      const [posResponse, masterResponse] = await Promise.all([
        getEventTypePosition(),
        getEventType()
      ]);

      const posData = posResponse || [];
      const masterData = masterResponse || [];

      // Create a map of icons from masterData
      const iconMap: Record<string, string> = {};
      masterData.forEach((item: any) => {
        if (item.id && item.iconImg) {
          iconMap[item.id] = item.iconImg;
        }
      });

      const tabs = buildSportTabs(posData);

      // Attach icons from master data
      tabs.forEach(t => {
        const masterItem = masterData.find((m: any) => m.id === t.id);
      });


      console.log("Analytics: Loaded sport tabs with icons", tabs.filter(t => t.icon));
      setEventTypes(tabs);
      // We no longer auto-select the first tab to ensure the initial fetch is global (eventTypeId: "")
      // if (tabs.length > 0 && !activeSportId) {
      //   setActiveSportId(tabs[0].id);
      // }
    } catch (e) {
      console.error("Failed to load sport tabs:", e);
      setEventTypes([]);
    }
  }, [activeSportId, refreshKey]);

  useEffect(() => {
    loadEventTypes();
  }, [loadEventTypes]);

  const loadMarkets = useCallback(() => {
    setMarketsLoading(true);
    setMarketsError(null);
    // If showAllEvents is false, we fetch all sports live (-1/false)
    // If showAllEvents is true, we fetch active sport all (activeSportId/true)
    const targetId = showAllEvents ? activeSportId : "-1";
    const allFlag = showAllEvents;

    getMarketByEventTypeId(targetId, allFlag)
      .then((rows) => setMarketRows(rows))
      .catch((e) => {
        setMarketRows([]);
        setMarketsError(e instanceof Error ? e.message : "Failed to load markets.");
      })
      .finally(() => setMarketsLoading(false));
  }, [activeSportId, showAllEvents, refreshKey]);

  const loadLiveBets = useCallback(() => {
    setBetsLoading(true);
    setBetsError(null);
    getLiveBets(
      {
        page: 1,
        pageSize: 10,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { eventTypeId: "" },
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
  }, [refreshKey]);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  useEffect(() => {
    loadLiveBets();
  }, [loadLiveBets]);

  const matchedStakeByEventId = useMemo(
    () => sumMatchedStakesByEventId(liveBetRows),
    [liveBetRows],
  );

  const filteredEvents = useMemo(() => {
    let rows = marketRows;

    // If we fetched -1/false, we need to filter the rows by the current activeSportId in the UI
    if (!showAllEvents && activeSportId) {
      rows = marketRows.filter((ev) => {
        const anyEv = ev as any;
        const eid =
          anyEv.eventType?.id ??
          anyEv.eventTypeId ??
          ev.markets?.[0]?.eventType?.id;
        return String(eid) === activeSportId;
      });
    }

    // If showAllEvents is false, ONLY show events that have betting activity
    if (!showAllEvents) {
      return rows.filter((ev) => {
        // 1. Check nested markets for the hasBet flag
        if (ev.markets?.some((m: any) => m.hasBet)) return true;

        // 2. Check API-provided bet count/stake on the event row
        const bets = readBetCount(ev);
        const stake = coerceAmount((ev as any).totalStake || (ev as any).totalMatched || 0);
        if (bets > 0 || (stake ?? 0) > 0) return true;

        // 3. Check matched bets from our local live bets fetch
        const eid =
          ev.id != null && String(ev.id).trim()
            ? String(ev.id).trim()
            : pickStr(ev as Record<string, unknown>, ["eventId", "_id"]) ?? "";
        const tradedTotal = tradedStakeForEventRow(
          matchedStakeByEventId,
          ev,
          eid,
        );
        if (tradedTotal > 0) return true;

        return false;
      });
    }

    return rows;
  }, [marketRows, showAllEvents, activeSportId, matchedStakeByEventId]);

  const dynamicTabs = useMemo(() => {
    if (showAllEvents) return eventTypes;
    return eventTypes.filter((t) => t.hasBet);
  }, [eventTypes, showAllEvents]);

  // If activeSportId is not in dynamicTabs, pick the first one
  useEffect(() => {
    if (dynamicTabs.length > 0) {
      const currentExists = dynamicTabs.some((t) => t.id === activeSportId);
      if (!currentExists && !showAllEvents) {
        setActiveSportId(dynamicTabs[0].id);
      }
    }
  }, [dynamicTabs, activeSportId, showAllEvents]);

  const emptyFilterMsg =
    !marketsLoading &&
    marketRows.length > 0 &&
    filteredEvents.length === 0 &&
    !showAllEvents;

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
        className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm ${wsConnected && wsAuthed
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
        <div className="flex flex-col gap-4 px-2 py-4 sm:px-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2 rounded-xl bg-zinc-100/80 p-1.5 dark:bg-zinc-800/50">
                  {dynamicTabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveSportId(t.id)}
                      className={`flex items-center gap-2.5 rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 ${activeSportId === t.id
                          ? "bg-white text-[#0066cc] shadow-sm ring-1 ring-zinc-200/50 dark:bg-zinc-900 dark:text-sky-400 dark:ring-zinc-700/50"
                          : "text-zinc-600 hover:bg-white/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700/50 dark:hover:text-zinc-200"
                        }`}
                    >
                      <span>{t.label}</span>
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
                  No events with active bets for this sport. Turn on &quot;Show all events&quot; to see all
                  available markets.
                </p>
              )}

              <div className="overflow-x-hidden rounded-lg">
                <Table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-auto" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                  </colgroup>
                  <TableHeader className="bg-[#bcbcbc] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <TableHead className="py-2.5 pl-4 font-bold uppercase tracking-wider">MARKETS</TableHead>
                    <TableHead className="w-[120px] border-l border-zinc-300/50 text-center font-bold">1</TableHead>
                    <TableHead className="w-[120px] border-l border-zinc-300/50 text-center font-bold">X</TableHead>
                    <TableHead className="w-[120px] border-l border-zinc-300/50 text-center font-bold">2</TableHead>
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
                            className={`group relative transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40 ${canOpenEvent ? "cursor-pointer" : ""}`}
                            onClick={canOpenEvent ? openEventDetail : undefined}
                          >
                            <TableCell className="py-4 pl-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="truncate text-sm font-bold text-zinc-900 transition-colors group-hover:text-sky-700 dark:text-zinc-100">
                                      {title}
                                    </span>
                                    {inPlay ? (
                                      <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50/30 px-3 py-1 text-[11px] font-bold uppercase tracking-tight text-emerald-700 dark:bg-emerald-950/10 dark:text-emerald-400">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                        In Play
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                                    {when}
                                  </div>
                                  <BetsTradedStatTiles bets={bets} traded={traded} />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="border-l border-zinc-300/50 p-0 dark:border-zinc-800">
                              <RunnerOddsCell
                                runnerBook={book1}
                                inPlay={inPlay}
                              />
                            </TableCell>
                            <TableCell className="border-l border-zinc-300/50 p-0 dark:border-zinc-800">
                              <RunnerOddsCell
                                runnerBook={bookX}
                                inPlay={inPlay}
                              />
                            </TableCell>
                            <TableCell className="border-l border-zinc-300/50 p-0 dark:border-zinc-800">
                              <RunnerOddsCell
                                runnerBook={book2}
                                inPlay={inPlay}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Right Side: Bet Card / Summary */}
            <div className="w-full shrink-0 space-y-4 lg:w-[320px]">
              {liveBetRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-xs text-zinc-500 dark:border-zinc-800">
                  No matched bets for the current filter.
                </div>
              ) : (
                liveBetRows.map((row, i) => {
                  const r = row as Record<string, unknown>;
                  const { eventName, marketName } = liveBetEventAndMarketNames(r);
                  const runner = String(r.runnerName ?? "").trim();
                  const cardTitle = eventMarketTitle(
                    runner || eventName || "Event",
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
                })
              )}
            </div>
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
