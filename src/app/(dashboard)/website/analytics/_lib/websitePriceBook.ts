"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { getAuthSession } from "@/store/authStore";
import type {
  MarketByEventMarket,
  MarketByEventMarketRunnerEntry,
  MarketByEventRow,
} from "@/services/position.service";

export type FootballScoreSide = {
  name?: string;
  score?: string | number; // Total goals
  halfTimeScore?: string | number;
  fullTimeScore?: string | number;
  numberOfYellowCards?: number;
  numberOfRedCards?: number;
  numberOfCorners?: number;
  isServing?: boolean;
};

export type FootballUpdateDetail = {
  updateTime: string;
  updateId: number;
  team: "home" | "away" | "none";
  teamName: string;
  matchTime: number;
  elapsedRegularTime: number;
  type: "KickOff" | "Goal" | "YellowCard" | "RedCard" | "SecondHalfKickOff" | string;
  updateType: string;
};

export type FootballScore = {
  home: FootballScoreSide;
  away: FootballScoreSide;
  status?: string;
  inPlayMatchStatus?: string;
  timeElapsed?: number;
  elapsedRegularTime?: number;
  updateDetails?: FootballUpdateDetail[];
};

export type TennisScoreSide = {
  name?: string;
  score?: string; // Points (0, 15, 30, 40, AD)
  games?: string | number; // Current set games
  sets?: string | number; // Total sets won
  gameSequence?: string[]; // Array of games per set (e.g. ["6", "2"])
  isServing?: boolean;
};

export type TennisScore = {
  home: TennisScoreSide;
  away: TennisScoreSide;
  currentSet?: number;
  currentGame?: number;
  fullTimeElapsed?: {
    hour: number;
    min: number;
    sec: number;
  };
};

export type ScorePayload = {
  eventId: string;
  eventTypeId: number;
  score: FootballScore | TennisScore;
  currentSet?: number;
  currentGame?: number;
  fullTimeElapsed?: {
    hour: number;
    min: number;
    sec: number;
  };
  // Football specific top-level
  status?: string;
  inPlayMatchStatus?: string;
  timeElapsed?: number;
  elapsedRegularTime?: number;
  updateDetails?: FootballUpdateDetail[];
};

export const WS_SINGLETON_KEY = "__sportsManagerWebsiteAnalyticsWs";

export const DEFAULT_WS =
  (typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_WEBSITE_ANALYTICS_WS_URL as string | undefined) ||
      (process.env.NEXT_PUBLIC_WS_URL as string | undefined)
    : undefined) || "wss://ws1bde3a1550.one247.io/ws";

const WS_SUBSCRIBE_MARKETS_MESSAGE_TYPE = 7;
const WS_SUBSCRIBE_SCORES_MESSAGE_TYPE = 3;

export function serializeSubscribeScoresMessage(scids: string[]): string {
  return JSON.stringify({
    MessageType: WS_SUBSCRIBE_SCORES_MESSAGE_TYPE,
    Scid: scids,
  });
}

export function serializeSubscribeMarketsMessage(mids: string[]): string {
  return JSON.stringify({
    MessageType: WS_SUBSCRIBE_MARKETS_MESSAGE_TYPE,
    Mids: mids,
  });
}

/** Event-level subscribe: server expects exchange `sourceId` in `match`, not internal `eventId`. */
export function serializeWsEventSubscribeMessage(matchSourceId: string): string {
  return JSON.stringify({
    type: "subscribe",
    match: matchSourceId.trim(),
  });
}

export type WsPriceLevel = {
  price?: number;
  size?: number;
  percentage?: number;
  p?: number;
  s?: number;
  v?: number;
  0?: number;
  1?: number;
};

/** Normalized ladder cell for UI (exchange liquidity and/or fancy `percentage`). */
export type NormalizedPriceLevel = {
  price?: number;
  size?: number;
  percentage?: number;
};

export type WsRunnerBookRow = {
  rId?: string;
  rs?: number;
  bp?: WsPriceLevel[];
  lp?: WsPriceLevel[];
};

export type WsMarketBookPayload = {
  id?: string;
  eid?: string;
  ip?: boolean;
  mr?: WsRunnerBookRow[];
  tm?: number;
  /** Exchange feed: status, source id, market/runner temp status, betting type (see one247 WS). */
  s?: number;
  sid?: string;
  ms?: number;
  ts?: number;
  bt?: number;
  totalMatched?: number;
  traded?: number;
  volume?: number;
  matched?: number;
};

export function normWsType(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function isWsMarketBookPayloadArray(data: unknown): data is WsMarketBookPayload[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0];
  if (!first || typeof first !== "object") return false;
  const mr = (first as WsMarketBookPayload).mr;
  if (!Array.isArray(mr) || mr.length === 0) return false;
  const r0 = mr[0];
  if (!r0 || typeof r0 !== "object") return false;
  const rid = (r0 as WsRunnerBookRow).rId;
  if (rid == null || String(rid).trim() === "") return false;
  return true;
}

/**
 * one247-style deltas: `ts: 2` frames often send `mr` with only `rId`/`rs` (no `bp`/`lp`) = ladder hidden / ball running.
 * Omitting `bp`/`lp` must clear prior levels; including them replaces that side.
 */
export function mergeWsMarketBook(
  prev: WsMarketBookPayload | undefined,
  incoming: WsMarketBookPayload,
): WsMarketBookPayload {
  const incMr = incoming.mr;
  if (incMr == null) {
    return { ...prev, ...incoming, mr: prev?.mr };
  }
  if (incMr.length === 0) {
    return { ...prev, ...incoming, mr: prev?.mr ?? [] };
  }
  const prevMr = prev?.mr ?? [];
  const byRid = new Map<string, WsRunnerBookRow>();
  for (const r of prevMr) {
    const id = r?.rId != null ? String(r.rId) : "";
    if (id) byRid.set(id, r);
  }
  const nextMr: WsRunnerBookRow[] = incMr.map((inc) => {
    const rid = inc?.rId != null ? String(inc.rId) : "";
    const old = rid ? byRid.get(rid) : undefined;
    const o = inc as Record<string, unknown>;
    const hasBp = Object.prototype.hasOwnProperty.call(o, "bp");
    const hasLp = Object.prototype.hasOwnProperty.call(o, "lp");
    const next: WsRunnerBookRow = {
      rId: rid || undefined,
      rs: inc.rs !== undefined ? inc.rs : old?.rs,
    };
    if (hasBp) next.bp = inc.bp;
    if (hasLp) next.lp = inc.lp;
    return next;
  });
  const prevRec = prev as unknown as Record<string, unknown>;
  const incRec = incoming as unknown as Record<string, unknown>;
  const volumePatch = preserveWsVolumeScalarsFromPrev(prevRec, incRec);
  return {
    ...prev,
    ...incoming,
    ...volumePatch,
    mr: nextMr,
  };
}

/** Deltas often omit traded/tm; keep prior scalars so list rows don’t flash to 0. */
const WS_VOLUME_SCALAR_RE =
  /^(traded|tm|totalmatched|volume|matched|turnover|turnoveramount|totaltraded)$/i;

function preserveWsVolumeScalarsFromPrev(
  prev: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  if (!prev) return {};
  const incLower = new Set(Object.keys(incoming).map((k) => k.toLowerCase()));
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(prev)) {
    if (!WS_VOLUME_SCALAR_RE.test(k)) continue;
    if (incLower.has(k.toLowerCase())) continue;
    patch[k] = v;
  }
  return patch;
}

export function mergePriceBooksPayload(
  data: WsMarketBookPayload[],
  setPriceBooks: Dispatch<SetStateAction<Record<string, WsMarketBookPayload>>>,
) {
  setPriceBooks((prev) => {
    const next = { ...prev };
    for (const row of data) {
      if (!row?.id) continue;
      const id = String(row.id);
      next[id] = mergeWsMarketBook(next[id], row);
    }
    return next;
  });
}

export function parseWsJsonObject(raw: string): Record<string, unknown> | null {
  let s = raw.trim();
  for (let i = 0; i < 4; i++) {
    try {
      const v = JSON.parse(s) as unknown;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return v as Record<string, unknown>;
      }
      if (typeof v === "string") {
        s = v;
        continue;
      }
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function messageEventToText(ev: MessageEvent): Promise<string> {
  const d = ev.data;
  if (typeof d === "string") return d;
  if (d instanceof Blob) return d.text();
  if (d instanceof ArrayBuffer) return new TextDecoder().decode(d);
  return String(d ?? "");
}

export function formatLiquidity(size: number | undefined): string {
  if (size == null || !Number.isFinite(size)) return "";
  const n = Number(size);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  if (Math.abs(n) >= 100) return n.toFixed(0);
  return n.toFixed(1);
}

export function getDisplayCurrencyRate(): number {
  const r = Number(getAuthSession()?.currency?.rate ?? 1);
  return Number.isFinite(r) && r > 0 ? r : 1;
}

export function coerceAmount(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n =
    typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function isLikelyDecimalOdds(n: number): boolean {
  return n >= 1.001 && n < 500;
}

function applyOddsStakeHeuristic(
  a: number | undefined,
  b: number | undefined,
): { price?: number; size?: number } {
  if (a == null && b == null) return {};
  if (b == null && a != null) return { price: a };
  if (a == null && b != null) return { price: b };

  let x = a!;
  let y = b!;
  const xOdds = isLikelyDecimalOdds(x);
  const yOdds = isLikelyDecimalOdds(y);

  if (yOdds && !xOdds) return { price: y, size: x };
  if (xOdds && !yOdds) return { price: x, size: y };

  if (xOdds && yOdds) {
    const xFrac = x % 1 !== 0;
    const yFrac = y % 1 !== 0;
    if (xFrac && !yFrac && y >= x * 2) return { price: x, size: y };
    if (yFrac && !xFrac && x >= y * 2) return { price: y, size: x };
    const lo = Math.min(x, y);
    const hi = Math.max(x, y);
    if (isLikelyDecimalOdds(lo) && hi > lo * 5) return { price: lo, size: hi };
    return { price: lo, size: hi };
  }

  const lo = Math.min(x, y);
  const hi = Math.max(x, y);
  if (isLikelyDecimalOdds(lo) && hi >= 100 && hi > lo * 5) return { price: lo, size: hi };
  return { price: x, size: y };
}

/**
 * Some feeds assign liquidity to the odds field and odds to the volume field.
 * If `price` is not in the odds band but `size` is, treat them as swapped.
 */
function correctSwappedPriceAndStake(out: {
  price?: number;
  size?: number;
}): { price?: number; size?: number } {
  const p = out.price;
  const s = out.size;
  if (p == null || s == null) return out;
  if (!isLikelyDecimalOdds(p) && isLikelyDecimalOdds(s)) {
    return { price: s, size: p };
  }
  return out;
}

export function normalizePriceLevel(level: unknown): NormalizedPriceLevel {
  if (level == null) return {};
  if (Array.isArray(level) && level.length >= 2) {
    return correctSwappedPriceAndStake(
      applyOddsStakeHeuristic(coerceAmount(level[0]), coerceAmount(level[1])),
    );
  }
  if (typeof level !== "object") return {};
  const o = level as Record<string, unknown>;
  const pct = coerceAmount(
    o.percentage ?? o.Percentage ?? o.pct ?? o.pctg,
  );
  const a = coerceAmount(o.price ?? o.p ?? o.P ?? o.Price);
  const b = coerceAmount(
    o.size ?? o.s ?? o.sz ?? o.v ?? o.vol ?? o.Volume ?? o.stake,
  );
  if (a == null && b == null) {
    if (pct != null && Number.isFinite(pct)) return { percentage: pct };
    return {};
  }
  const base = correctSwappedPriceAndStake(applyOddsStakeHeuristic(a, b));
  if (pct != null && Number.isFinite(pct)) return { ...base, percentage: pct };
  return base;
}

export function formatOddsPrice(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 100) return n.toFixed(2);
  if (n % 1 === 0) return String(n);
  const t = n.toFixed(3).replace(/\.?0+$/, "");
  return t || "—";
}

function padPriceLevels(levels: NormalizedPriceLevel[], max: number): NormalizedPriceLevel[] {
  const out = levels.slice(0, max);
  while (out.length < max) out.push({});
  return out;
}

/** Best back prices first (highest odds = best for backers), up to `max` levels. */
export function bestBackLevels(book: WsRunnerBookRow | undefined, max = 3) {
  const raw = book?.bp ?? [];
  const levels = raw
    .map((x) => normalizePriceLevel(x))
    .filter((l) => l.price != null && Number.isFinite(l.price));
  levels.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  return padPriceLevels(levels, max);
}

/** Best lay prices first (lowest odds = best for layers), up to `max` levels. */
export function bestLayLevels(book: WsRunnerBookRow | undefined, max = 3) {
  const raw = book?.lp ?? [];
  const levels = raw
    .map((x) => normalizePriceLevel(x))
    .filter((l) => l.price != null && Number.isFinite(l.price));
  levels.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  return padPriceLevels(levels, max);
}

export function lookupRunnerBook(
  books: Record<string, WsMarketBookPayload>,
  marketId: string | undefined,
  runnerId: string | undefined,
): WsRunnerBookRow | undefined {
  if (!marketId || !runnerId) return undefined;
  const m = books[marketId];
  if (!m?.mr?.length) return undefined;
  const rid = String(runnerId);
  return m.mr.find((r) => String(r.rId) === rid);
}

function isDrawRunner(name: string): boolean {
  return /^the\s+draw$/i.test(name.trim()) || /^draw$/i.test(name.trim());
}

export function partitionMatchOddsRunners(entries: MarketByEventMarketRunnerEntry[] | undefined) {
  const list = Array.isArray(entries) ? entries : [];
  const runners = list
    .map((e) => ({
      entry: e,
      name: String(e.runner?.name ?? "").trim() || "—",
    }))
    .filter((x) => x.name !== "—");
  const drawIdx = runners.findIndex((r) => isDrawRunner(r.name));
  if (drawIdx >= 0) {
    const others = runners.filter((_, i) => i !== drawIdx);
    return {
      col1: others[0] ?? null,
      colX: runners[drawIdx] ?? null,
      col2: others[1] ?? null,
    };
  }
  return {
    col1: runners[0] ?? null,
    colX: null,
    col2: runners[1] ?? null,
  };
}

export function findMatchOddsMarket(event: MarketByEventRow) {
  const markets = Array.isArray(event.markets) ? event.markets : [];
  return (
    markets.find((m) => String(m.marketType ?? "").toUpperCase() === "MATCH_ODDS") ??
    markets[0]
  );
}

export function normalizeMarketTypeKey(
  m: Pick<MarketByEventMarket, "marketType" | "name">,
): string {
  return String(m.marketType ?? "").toUpperCase().replace(/\s+/g, "_").trim();
}

export function isMatchOddsMarketByMeta(m: MarketByEventMarket): boolean {
  const t = normalizeMarketTypeKey(m);
  if (t === "MATCH_ODDS" || t === "MATCHODDS") return true;
  if (t.includes("MATCH_ODDS")) return true;
  const n = String(m.name ?? "");
  return /\bmatch\s+odds\b/i.test(n);
}

/** Exchange “Over/Under X Goals” lines — show as full ladder like Match Odds, not under Fancy. */
export function isGoalsOverUnderMarket(m: MarketByEventMarket): boolean {
  const n = String(m.name ?? "");
  return /\bover\s*\/\s*under\b/i.test(n) && /\bgoals?\b/i.test(n);
}

function goalsOverUnderLineSortKey(m: MarketByEventMarket): number {
  const name = String(m.name ?? "");
  const mch = name.match(/over\s*\/\s*under\s+([\d.]+)/i);
  if (mch) {
    const v = parseFloat(mch[1]);
    if (Number.isFinite(v)) return v;
  }
  const d = Number((m as { displayOrder?: unknown }).displayOrder);
  return Number.isFinite(d) ? d : 999;
}

export function sortGoalsOverUnderMarkets(
  markets: MarketByEventMarket[],
): MarketByEventMarket[] {
  return [...markets].sort((a, b) => {
    const ka = goalsOverUnderLineSortKey(a);
    const kb = goalsOverUnderLineSortKey(b);
    if (ka !== kb) return ka - kb;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });
}

/**
 * Event detail: only treat a market as Match Odds when metadata matches, or when it is the
 * sole two-way market on the event (avoids classifying Fancy/Bookmaker as Match Odds).
 */
export function findMatchOddsMarketStrict(
  event: MarketByEventRow,
): MarketByEventMarket | undefined {
  const markets = Array.isArray(event.markets) ? event.markets : [];
  const hit = markets.find((m) => isMatchOddsMarketByMeta(m));
  if (hit) return hit;
  if (markets.length === 1) {
    const only = markets[0];
    if ((only?.marketRunner?.length ?? 0) >= 2) return only;
  }
  return undefined;
}

export function collectMatchOddsMarketIds(rows: MarketByEventRow[]): string[] {
  const ids = new Set<string>();
  for (const ev of rows) {
    const m = findMatchOddsMarket(ev);
    if (m?.id != null && String(m.id).trim()) ids.add(String(m.id));
  }
  return [...ids];
}

export function collectAllMarketIdsFromEvent(event: MarketByEventRow | null): string[] {
  if (!event?.markets?.length) return [];
  const ids = new Set<string>();
  for (const m of event.markets) {
    if (m?.id != null && String(m.id).trim()) ids.add(String(m.id));
  }
  return [...ids];
}

export function unwrapWsData(raw: unknown, depth = 0): unknown {
  if (raw == null || depth > 4) return raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return raw;
    try {
      return unwrapWsData(JSON.parse(s), depth + 1);
    } catch {
      return raw;
    }
  }
  return raw;
}

export function useWebsitePriceBookWs(options: {
  marketIds: string[];
  onRefreshSignal?: () => void;
  /** Exchange event id (`sourceId`) for `{"type":"subscribe","match"}` — used on single-event views. */
  wsEventSubscribeId?: string;
}) {
  const { marketIds, onRefreshSignal, wsEventSubscribeId } = options;
  const marketIdsKey = useMemo(() => [...marketIds].sort().join("\0"), [marketIds]);
  const subscribeMatchKey = useMemo(
    () => String(wsEventSubscribeId ?? "").trim(),
    [wsEventSubscribeId],
  );
  const wsRef = useRef<WebSocket | null>(null);
  const onRefreshRef = useRef(onRefreshSignal);
  onRefreshRef.current = onRefreshSignal;

  const [priceBooks, setPriceBooks] = useState<Record<string, WsMarketBookPayload>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const [wsAuthed, setWsAuthed] = useState(false);
  const [wsNote, setWsNote] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, TennisScore>>({});

  useEffect(() => {
    const w = wsRef.current;
    if (!w || w.readyState !== WebSocket.OPEN || !wsAuthed) return;
    const mids = marketIds;
    const scid = subscribeMatchKey;
    if (mids.length === 0 && !scid) return;
    try {
      if (scid) {
        w.send(serializeWsEventSubscribeMessage(scid));
        w.send(serializeSubscribeScoresMessage([scid]));
      }
      if (mids.length > 0) {
        w.send(serializeSubscribeMarketsMessage(mids));
      }
    } catch {
      /* ignore */
    }
  }, [marketIdsKey, subscribeMatchKey, wsConnected, wsAuthed]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pingTimer: number | null = null;
    let cancelled = false;
    let reconnectTimer: number | null = null;
    let reconnectDelayMs = 2000;

    const stopPing = () => {
      if (pingTimer != null) {
        window.clearInterval(pingTimer);
        pingTimer = null;
      }
    };

    const startPing = () => {
      stopPing();
      pingTimer = window.setInterval(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        try {
          ws.send(JSON.stringify({ messageType: 9 }));
        } catch {
          /* ignore */
        }
      }, 25000);
    };

    const getWsAuthPayload = (): { token: string; authToken: string } | null => {
      const session = getAuthSession();
      const token = String(session.token ?? "").trim();
      const authToken = String(session.primaryToken ?? "").trim();
      if (!token || !authToken) return null;
      return { token, authToken };
    };

    const closeExistingSingleton = () => {
      if (typeof window === "undefined") return;
      const g = window as unknown as Record<string, unknown>;
      const existing = g[WS_SINGLETON_KEY];
      if (!existing || typeof existing !== "object") return;
      const existingWs = (existing as { ws?: WebSocket }).ws;
      if (!existingWs || existingWs.readyState === WebSocket.CLOSED) return;
      try {
        existingWs.close();
      } catch {
        /* ignore */
      }
    };

    const bumpRefresh = () => onRefreshRef.current?.();

    const scheduleReconnect = () => {
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        if (cancelled) return;
        connect();
      }, reconnectDelayMs);
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, 30000);
    };

    const connect = () => {
      if (cancelled) return;
      const auth = getWsAuthPayload();
      if (!auth) {
        setWsConnected(false);
        setWsAuthed(false);
        setWsNote("Sign in to connect WebSocket.");
        return;
      }
      closeExistingSingleton();
      setWsNote(null);
      try {
        ws = new WebSocket(DEFAULT_WS);
      } catch {
        setWsLast();
        scheduleReconnect();
        return;
      }
      if (typeof window !== "undefined") {
        const g = window as unknown as Record<string, unknown>;
        g[WS_SINGLETON_KEY] = { ws };
      }

      ws.onopen = () => {
        if (cancelled) return;
        reconnectDelayMs = 2000;
        wsRef.current = ws;
        setWsConnected(true);
        setWsAuthed(false);
        stopPing();
        const a = getWsAuthPayload();
        if (!a) return;
        try {
          ws?.send(JSON.stringify({ ...a, messageType: 1 }));
        } catch {
          /* ignore */
        }
      };

      ws.onmessage = (ev) => {
        if (cancelled) return;
        void (async () => {
          const raw = await messageEventToText(ev);
          if (!raw.trim()) return;

          const msg = parseWsJsonObject(raw);
          if (!msg) {
            try {
              const v = JSON.parse(raw.trim()) as unknown;
              if (Array.isArray(v) && isWsMarketBookPayloadArray(v)) {
                mergePriceBooksPayload(v, setPriceBooks);
              }
            } catch {
              /* ignore */
            }
            return;
          }

          let t = normWsType(
            msg.wsMessageType ?? msg.MessageType ?? msg["WsMessageType"],
          );
          let data: unknown = unwrapWsData(msg.data);

          if (data && typeof data === "object" && !Array.isArray(data)) {
            const inner = data as Record<string, unknown>;
            const innerT = normWsType(inner.wsMessageType ?? inner.MessageType);
            if (innerT === 8 && inner.data !== undefined) {
              t = 8;
              data = unwrapWsData(inner.data);
            }
          }

          if (t === 1) {
            const authedOk =
              data === true ||
              data === "true" ||
              (msg.success === true && (data === true || data === undefined));
            if (authedOk) {
              setWsAuthed(true);
              startPing();
            }
            return;
          }

          if (t === 9) return;

          if (t === 2 || t === 4) {
            bumpRefresh();
            return;
          }

          const arr = Array.isArray(data) ? data : null;
          if (
            arr &&
            isWsMarketBookPayloadArray(arr) &&
            (t === 8 || (!Number.isFinite(t) && msg.success === true))
          ) {
            mergePriceBooksPayload(arr, setPriceBooks);
          }

          if (t === 3 && arr) {
            setScores((prev) => {
              const next = { ...prev };
              for (const item of arr as ScorePayload[]) {
                if (item.eventId && item.score) {
                  // Merge top-level fields into the score object for easier consumption
                  const finalScore: any = {
                    ...item.score,
                    currentSet: item.currentSet ?? (item.score as any).currentSet,
                    currentGame: item.currentGame ?? (item.score as any).currentGame,
                    fullTimeElapsed: item.fullTimeElapsed ?? (item.score as any).fullTimeElapsed,
                    // Football specific
                    status: item.status ?? (item.score as any).status,
                    inPlayMatchStatus: item.inPlayMatchStatus ?? (item.score as any).inPlayMatchStatus,
                    timeElapsed: item.timeElapsed ?? (item.score as any).timeElapsed,
                    elapsedRegularTime: item.elapsedRegularTime ?? (item.score as any).elapsedRegularTime,
                    updateDetails: item.updateDetails ?? (item.score as any).updateDetails,
                  };
                  next[String(item.eventId)] = finalScore;
                }
              }
              return next;
            });
          }
        })();
      };

      ws.onerror = () => {
        setWsLast();
      };

      ws.onclose = () => {
        wsRef.current = null;
        setWsConnected(false);
        setWsAuthed(false);
        stopPing();
        if (!cancelled) scheduleReconnect();
      };

      function setWsLast() {
        setWsNote("WebSocket error — retrying…");
      }
    };

    connect();

    return () => {
      cancelled = true;
      wsRef.current = null;
      stopPing();
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ messageType: 11 }));
        }
      } catch {
        /* ignore */
      }
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      if (typeof window !== "undefined") {
        const g = window as unknown as Record<string, unknown>;
        delete g[WS_SINGLETON_KEY];
      }
    };
  }, []);

  return { priceBooks, scores, wsConnected, wsAuthed, wsNote };
}
