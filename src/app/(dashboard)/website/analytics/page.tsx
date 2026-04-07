"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Link from "next/link";
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
  type MarketByEventMarketRunnerEntry,
} from "@/services/position.service";
import { getLiveBets } from "@/services/bet.service";
import { getAuthSession } from "@/store/authStore";
import { formatCurrency } from "@/utils/formatCurrency";

const WS_SINGLETON_KEY = "__sportsManagerWebsiteAnalyticsWs";

const DEFAULT_WS =
  (typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_WEBSITE_ANALYTICS_WS_URL as string | undefined) ||
      (process.env.NEXT_PUBLIC_WS_URL as string | undefined)
    : undefined) || "wss://ws1bde3a1550.one247.io/ws";

/** Outbound subscribe for match-odds markets; server pushes runner books as `wsMessageType: 8`. */
const WS_SUBSCRIBE_MARKETS_MESSAGE_TYPE = 7;

function serializeSubscribeMarketsMessage(mids: string[]): string {
  return JSON.stringify({
    MessageType: WS_SUBSCRIBE_MARKETS_MESSAGE_TYPE,
    Mids: mids,
  });
}

/** WebSocket `wsMessageType` 8 — compressed price book per market (`data[]`). */
type WsPriceLevel = {
  price?: number;
  size?: number;
  p?: number;
  s?: number;
  v?: number;
  /** Some feeds send `[decimalOdds, stake]` */
  0?: number;
  1?: number;
};
type WsRunnerBookRow = {
  rId?: string;
  rs?: number;
  bp?: WsPriceLevel[];
  lp?: WsPriceLevel[];
};
type WsMarketBookPayload = {
  id?: string;
  eid?: string;
  ip?: boolean;
  mr?: WsRunnerBookRow[];
  /** Total matched / traded on market — when present from socket. */
  tm?: number;
  totalMatched?: number;
  traded?: number;
  volume?: number;
  matched?: number;
};

function normWsType(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Detect API price-book array `{ wsMessageType: 8, data: [...] }`. */
function isWsMarketBookPayloadArray(data: unknown): data is WsMarketBookPayload[] {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0];
  if (!first || typeof first !== "object") return false;
  const mr = (first as WsMarketBookPayload).mr;
  if (!Array.isArray(mr) || mr.length === 0) return false;
  const r0 = mr[0];
  if (!r0 || typeof r0 !== "object") return false;
  return Array.isArray((r0 as WsRunnerBookRow).bp) || Array.isArray((r0 as WsRunnerBookRow).lp);
}

function mergePriceBooksPayload(
  data: WsMarketBookPayload[],
  setPriceBooks: Dispatch<SetStateAction<Record<string, WsMarketBookPayload>>>,
) {
  setPriceBooks((prev) => {
    const next = { ...prev };
    for (const row of data) {
      if (row?.id) next[String(row.id)] = row;
    }
    return next;
  });
}

/** Parse socket text; handle double-encoded JSON strings. */
function parseWsJsonObject(raw: string): Record<string, unknown> | null {
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

async function messageEventToText(ev: MessageEvent): Promise<string> {
  const d = ev.data;
  if (typeof d === "string") return d;
  if (d instanceof Blob) return d.text();
  if (d instanceof ArrayBuffer) return new TextDecoder().decode(d);
  return String(d ?? "");
}

function formatLiquidity(size: number | undefined): string {
  if (size == null || !Number.isFinite(size)) return "";
  const n = Number(size);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  if (Math.abs(n) >= 100) return n.toFixed(0);
  return n.toFixed(1);
}

/** Same scaling as `formatCurrency` — depth sizes from the feed are in exchange units. */
function getDisplayCurrencyRate(): number {
  const r = Number(getAuthSession()?.currency?.rate ?? 1);
  return Number.isFinite(r) && r > 0 ? r : 1;
}

function coerceAmount(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n =
    typeof v === "string" ? parseFloat(v.replace(/,/g, "")) : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** Match-odds decimal prices are almost always in this band; stakes are often larger integers. */
function isLikelyDecimalOdds(n: number): boolean {
  return n >= 1.001 && n < 500;
}

/**
 * Some sockets send `price`/`size` reversed, or tuple `[odds, stake]`. Pick odds vs liquidity safely.
 */
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

function normalizePriceLevel(level: unknown): { price?: number; size?: number } {
  if (level == null) return {};
  if (Array.isArray(level) && level.length >= 2) {
    return applyOddsStakeHeuristic(coerceAmount(level[0]), coerceAmount(level[1]));
  }
  if (typeof level !== "object") return {};
  const o = level as Record<string, unknown>;
  const a = coerceAmount(o.price ?? o.p ?? o.P ?? o.Price);
  const b = coerceAmount(
    o.size ?? o.s ?? o.sz ?? o.v ?? o.vol ?? o.Volume ?? o.stake,
  );
  if (a == null && b == null) return {};
  return applyOddsStakeHeuristic(a, b);
}

function formatOddsPrice(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 100) return n.toFixed(2);
  if (n % 1 === 0) return String(n);
  const t = n.toFixed(3).replace(/\.?0+$/, "");
  return t || "—";
}

/** Sum best back + best lay size across runners (liquidity proxy when API matched is missing). */
function sumTopBookLiquidity(book: WsMarketBookPayload | undefined): number {
  if (!book?.mr?.length) return 0;
  let s = 0;
  for (const row of book.mr) {
    const b0 = normalizePriceLevel(row.bp?.[0]);
    const l0 = normalizePriceLevel(row.lp?.[0]);
    const bs = b0.size;
    const ls = l0.size;
    if (bs != null && bs > 0) s += bs;
    if (ls != null && ls > 0) s += ls;
  }
  return s;
}

const WS_MATCHED_KEYS: string[] = [
  "tm",
  "totalMatched",
  "traded",
  "volume",
  "matched",
  "turnOver",
  "TurnOver",
  "turnover",
];
const EVENT_MATCHED_KEYS: string[] = [
  "totalStake",
  "totalMatched",
  "traded",
  "volume",
  "totalVolume",
  "matchedVolume",
  "turnover",
  "turnOver",
];

function pickFirstPositiveAmount(
  obj: Record<string, unknown> | undefined,
  keys: string[],
): number | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const n = coerceAmount(obj[k]);
    if (n != null && n > 0) return n;
  }
  return undefined;
}

/**
 * Matched/traded from REST or socket; falls back to visible book liquidity so the row
 * isn't stuck at 0 while prices show depth.
 */
function readMatchedDisplay(
  ev: MarketByEventRow,
  wsBook: WsMarketBookPayload | undefined,
): { amount: number; source: "socket" | "api" | "liquidity" } {
  const wsObj = wsBook as Record<string, unknown> | undefined;
  const fromSocket = pickFirstPositiveAmount(wsObj, WS_MATCHED_KEYS);
  if (fromSocket != null) return { amount: fromSocket, source: "socket" };

  const evObj = ev as Record<string, unknown>;
  const fromApi = pickFirstPositiveAmount(evObj, EVENT_MATCHED_KEYS);
  if (fromApi != null) return { amount: fromApi, source: "api" };

  const liq = sumTopBookLiquidity(wsBook);
  if (liq > 0) return { amount: liq, source: "liquidity" };

  return { amount: 0, source: "api" };
}

function readBetCount(ev: MarketByEventRow): number {
  const o = ev as Record<string, unknown>;
  const keys = ["totalBets", "totalBet", "betCount", "betsCount", "bets"];
  for (const k of keys) {
    const n = coerceAmount(o[k]);
    if (n != null && n >= 0) return Math.floor(n);
  }
  return 0;
}

/** Compact schedule line: no weekday/seconds noise. */
function formatEventWhen(value: unknown): string {
  if (value === undefined || value === null) return "—";
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function lookupRunnerBook(
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

function isDrawRunner(name: string): boolean {
  return /^the\s+draw$/i.test(name.trim()) || /^draw$/i.test(name.trim());
}

function partitionMatchOddsRunners(entries: MarketByEventMarketRunnerEntry[] | undefined) {
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

function findMatchOddsMarket(event: MarketByEventRow) {
  const markets = Array.isArray(event.markets) ? event.markets : [];
  return (
    markets.find((m) => String(m.marketType ?? "").toUpperCase() === "MATCH_ODDS") ??
    markets[0]
  );
}

/** Match-odds market ids for WebSocket `MessageType` 7 subscription. */
function collectMatchOddsMarketIds(rows: MarketByEventRow[]): string[] {
  const ids = new Set<string>();
  for (const ev of rows) {
    const m = findMatchOddsMarket(ev);
    if (m?.id != null && String(m.id).trim()) ids.add(String(m.id));
  }
  return [...ids];
}

/**
 * Server often sends `data` as a JSON string (e.g. wsMessageType 2). Unwrap recursively (bounded).
 */
function unwrapWsData(raw: unknown, depth = 0): unknown {
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
  const [wsConnected, setWsConnected] = useState(false);
  const [wsAuthed, setWsAuthed] = useState(false);
  const [wsNote, setWsNote] = useState<string | null>(null);
  /** Live prices from WebSocket `wsMessageType` 8, keyed by market `id`. */
  const [priceBooks, setPriceBooks] = useState<Record<string, WsMarketBookPayload>>(
    {},
  );

  const wsRef = useRef<WebSocket | null>(null);

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
        pageSize: 10,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      { eventTypeId },
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

  /** After auth, subscribe so the gateway streams updated `mr`/`bp`/`lp` for these market ids. */
  useEffect(() => {
    const w = wsRef.current;
    if (!w || w.readyState !== WebSocket.OPEN || !wsAuthed) return;
    const mids = collectMatchOddsMarketIds(marketRows);
    if (mids.length === 0) return;
    try {
      w.send(serializeSubscribeMarketsMessage(mids));
    } catch {
      // ignore
    }
  }, [marketRows, wsConnected, wsAuthed]);

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
          // ignore
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
        // ignore
      }
    };

    const bumpRefresh = () => setRefreshKey((k) => k + 1);

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
        const auth = getWsAuthPayload();
        if (!auth) return;
        try {
          ws?.send(JSON.stringify({ ...auth, messageType: 1 }));
        } catch {
          // ignore
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

          /* Nested envelope e.g. data: { wsMessageType: 8, data: [...] } */
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
        ws?.close();
      } catch {
        // ignore
      }
      if (typeof window !== "undefined") {
        const g = window as unknown as Record<string, unknown>;
        delete g[WS_SINGLETON_KEY];
      }
    };
  }, []);

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
                    const when = ev.openDate ? formatEventWhen(ev.openDate) : "—";
                    const bets = readBetCount(ev);
                    const matched = readMatchedDisplay(ev, wsBook);
                    const matchedLabel =
                      matched.source === "liquidity" ? "Book liquidity" : "Matched";

                    return (
                      <TableRow key={String(ev.id ?? title)}>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="font-medium leading-snug text-foreground">
                                {title}
                              </div>
                              <div className="text-xs text-foreground-secondary">
                                {when}
                              </div>
                              <div className="text-xs text-foreground-tertiary">
                                <span className="tabular-nums">{bets}</span> bets ·{" "}
                                <span className="tabular-nums">{matchedLabel}</span>:{" "}
                                <span className="font-medium text-foreground-secondary tabular-nums">
                                  {formatCurrency(matched.amount)}
                                </span>
                                {matched.source === "liquidity" ? (
                                  <span className="text-foreground-tertiary">
                                    {" "}
                                    (visible depth)
                                  </span>
                                ) : null}
                              </div>
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

          <div className="space-y-2">
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
                  <TableHead align="right">Stake</TableHead>
                  <TableHead align="right">Odds</TableHead>
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
                      const odds = r.odds ?? r.price ?? r.matchOdd;
                      return (
                        <TableRow key={pickStr(r, ["id", "betId"]) ?? i}>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {event}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate text-sm">
                            {mkt}
                          </TableCell>
                          <TableCell align="right" className="tabular-nums text-sm">
                            {formatCurrency(stake ?? 0)}
                          </TableCell>
                          <TableCell align="right" className="tabular-nums text-sm">
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
                Showing {liveBetRows.length} of {liveBetTotal}. Open{" "}
                <Link href="/sports/betlist" className="text-primary underline">
                  Sports betlist
                </Link>{" "}
                for full filters.
              </p>
            ) : null}
          </div>
        </div>
      </ListPageFrame>
    </div>
  );
}
