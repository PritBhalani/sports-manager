"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PageHeader,
  ListPageFrame,
  ListTableSection,
  FilterBar,
  Select,
  Input,
  Button,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components";
import { RefreshCw } from "lucide-react";
import { getEventType, type EventTypeRecord } from "@/services/eventtype.service";
import {
  getAllMarketTypeMapping,
  type MarketTypeMapping,
} from "@/services/market.service";
import { getLiveBets, type LiveBetRow } from "@/services/bet.service";
import { formatCurrency } from "@/utils/formatCurrency";
import { formatDateTime } from "@/utils/date";
import { getAuthSession } from "@/store/authStore";

const PAGE_SIZE = 50;
const WS_URL =
  (typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_WS_URL as string | undefined)
    : undefined) || "wss://ws1bde3a2661.one247.bet/ws";

function pickStr(r: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function eventTypeOption(e: EventTypeRecord): { value: string; label: string } | null {
  if (!e || typeof e !== "object") return null;
  const id = pickStr(e as Record<string, unknown>, ["id"]);
  const name = pickStr(e as Record<string, unknown>, ["name"]);
  if (!id || !name) return null;
  return { value: id, label: name };
}

function marketTypeOption(m: MarketTypeMapping): { value: string; label: string } {
  return { value: m.marketTypeCode, label: m.displayName || m.marketTypeCode };
}

export default function SportsBetlistPage() {
  const [eventTypes, setEventTypes] = useState<EventTypeRecord[]>([]);
  const [marketTypes, setMarketTypes] = useState<MarketTypeMapping[]>([]);
  const [rows, setRows] = useState<LiveBetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventTypeId, setEventTypeId] = useState("");
  const [marketTypeCode, setMarketTypeCode] = useState("");
  const [stakeFrom, setStakeFrom] = useState("");
  const [stakeTo, setStakeTo] = useState("");
  const [memberName, setMemberName] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsAuthed, setWsAuthed] = useState(false);
  const [wsLastClose, setWsLastClose] = useState<string | null>(null);
  const [wsLastError, setWsLastError] = useState<string | null>(null);

  useEffect(() => {
    getEventType()
      .then((list) => setEventTypes(Array.isArray(list) ? list : []))
      .catch(() => setEventTypes([]));
    getAllMarketTypeMapping()
      .then((list) => setMarketTypes(Array.isArray(list) ? list : []))
      .catch(() => setMarketTypes([]));
  }, []);

  const eventOptions = useMemo(() => {
    const opts = eventTypes.map(eventTypeOption).filter(Boolean) as Array<{
      value: string;
      label: string;
    }>;
    return [{ value: "", label: "All" }, ...opts];
  }, [eventTypes]);

  const marketTypeOptions = useMemo(() => {
    const opts = marketTypes.map(marketTypeOption);
    return [{ value: "", label: "All" }, ...opts];
  }, [marketTypes]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getLiveBets(
      {
        page,
        pageSize,
        groupBy: "",
        orderBy: "",
        orderByDesc: false,
      },
      {
        side: "-1",
        inplay: false,
        eventTypeId: eventTypeId || "",
        marketTypeCode: marketTypeCode || "",
        stakefrom: stakeFrom.trim() ? Number(stakeFrom) : undefined,
        staketo: stakeTo.trim() ? Number(stakeTo) : undefined,
        eventName: memberName.trim() ? memberName.trim() : undefined,
      },
    )
      .then((res) => {
        setRows(res.items);
        setTotal(res.total);
      })
      .catch((e) => {
        setRows([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Failed to load live bets.");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, eventTypeId, marketTypeCode, stakeFrom, stakeTo, memberName, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  // WebSocket: authenticate (messageType=1) and ping (messageType=9).
  // On market/event updates (wsMessageType 2/4), trigger a refresh.
  useEffect(() => {
    let ws: WebSocket | null = null;
    let pingTimer: number | null = null;
    let authWaitTimer: number | null = null;
    let reconnectTimer: number | null = null;
    let cancelled = false;
    let reconnectDelayMs = 1000;
    let authed = false;
    let authAttempts = 0;
    const WS_SINGLETON_KEY = "__sportsManagerLiveBetsWs";

    const closeExistingSingleton = () => {
      if (typeof window === "undefined") return;
      const g = window as unknown as Record<string, unknown>;
      const existing = g[WS_SINGLETON_KEY];
      if (!existing || typeof existing !== "object") return;
      const existingWs = (existing as { ws?: WebSocket }).ws;
      if (!existingWs) return;
      if (existingWs.readyState === WebSocket.CLOSED) return;
      try {
        existingWs.close();
      } catch {
        // ignore
      }
    };

    const getWsAuthPayload = (): { token: string; authToken: string } | null => {
      // Server expects the same pair returned by login:
      // - token: `Token` (session.token)
      // - authToken: `Primary-Token` (session.primaryToken)
      const session = getAuthSession();
      const token = String(session.token ?? "").trim();
      const authToken = String(session.primaryToken ?? "").trim();
      if (!token || !authToken) return null;
      return { token, authToken };
    };

    const sendAuth = (payload: { token: string; authToken: string } | null) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      if (!payload) return;
      try {
        ws.send(JSON.stringify({ ...payload, messageType: 1 }));
      } catch {
        // ignore
      }
    };

    const scheduleAuthWait = () => {
      if (authWaitTimer != null) window.clearTimeout(authWaitTimer);
      authWaitTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (authed) return;

        if (authAttempts < 2) {
          // 1st attempt already sent; send exactly one more auth after 25s.
          authAttempts += 1;
          sendAuth(getWsAuthPayload());
          scheduleAuthWait();
          return;
        }

        // Still no reply after two auth attempts -> reconnect.
        try {
          ws?.close();
        } catch {
          // ignore
        }
      }, 25000);
    };

    const connect = () => {
      if (cancelled) return;
      const payload = getWsAuthPayload();
      if (!payload) {
        setWsConnected(false);
        setWsAuthed(false);
        setWsLastError("Missing auth tokens for WebSocket.");
        scheduleReconnect();
        return;
      }
      closeExistingSingleton();
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        setWsLastError("Failed to create WebSocket.");
        scheduleReconnect();
        return;
      }
      if (typeof window !== "undefined") {
        const g = window as unknown as Record<string, unknown>;
        g[WS_SINGLETON_KEY] = { ws };
      }

      ws.onopen = () => {
        setWsConnected(true);
        setWsAuthed(false);
        setWsLastClose(null);
        setWsLastError(null);
        reconnectDelayMs = 1000;
        authed = false;
        authAttempts = 1;

        // Authenticate once, then wait 25s before sending one more auth.
        sendAuth(payload);
        scheduleAuthWait();
      };

      ws.onmessage = (evt) => {
        const raw = typeof evt.data === "string" ? evt.data : "";
        if (!raw) return;
        try {
          const msg = JSON.parse(raw) as {
            wsMessageType?: number;
            data?: unknown;
          };
          if (msg?.wsMessageType === 1 && msg.data === true) {
            authed = true;
            setWsAuthed(true);
            if (authWaitTimer != null) window.clearTimeout(authWaitTimer);
            authWaitTimer = null;
            if (pingTimer == null) {
              pingTimer = window.setInterval(() => {
                try {
                  ws?.send(JSON.stringify({ messageType: 9 }));
                } catch {
                  // ignore
                }
              }, 25000);
            }
            return;
          }
          if (msg?.wsMessageType === 2 || msg?.wsMessageType === 4) {
            setRefreshKey((k) => k + 1);
          }
        } catch {
          // ignore non-json frames
        }
      };

      ws.onclose = (evt) => {
        setWsConnected(false);
        setWsAuthed(false);
        setWsLastClose(`code=${evt.code}${evt.reason ? ` reason=${evt.reason}` : ""}`);
        if (pingTimer != null) window.clearInterval(pingTimer);
        pingTimer = null;
        if (authWaitTimer != null) window.clearTimeout(authWaitTimer);
        authWaitTimer = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        setWsLastError("WebSocket error (see Network tab for details).");
      };
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      if (reconnectTimer != null) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        reconnectDelayMs = Math.min(30000, Math.floor(reconnectDelayMs * 1.6));
        connect();
      }, reconnectDelayMs);
    };

    connect();

    return () => {
      cancelled = true;
      setWsConnected(false);
      setWsAuthed(false);
      if (pingTimer != null) window.clearInterval(pingTimer);
      if (authWaitTimer != null) window.clearTimeout(authWaitTimer);
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {
        // ignore
      }
      if (typeof window !== "undefined") {
        const g = window as unknown as Record<string, unknown>;
        const existing = g[WS_SINGLETON_KEY];
        const existingWs =
          existing && typeof existing === "object"
            ? (existing as { ws?: WebSocket }).ws
            : undefined;
        if (existingWs === ws) {
          try {
            delete g[WS_SINGLETON_KEY];
          } catch {
            // ignore
          }
        }
      }
      ws = null;
    };
  }, []);

  const onClear = () => {
    setEventTypeId("");
    setMarketTypeCode("");
    setStakeFrom("");
    setStakeTo("");
    setMemberName("");
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader title="Live Bets" breadcrumbs={["Sports", "Betlist"]} />

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <ListPageFrame>
        <div className="flex w-full flex-col justify-center gap-0">
          <FilterBar className="rounded-none bg-neutral-200 px-5 pb-4 pt-4">
          <Select
            label="Sport"
            value={eventTypeId}
            onChange={(e) => {
              setEventTypeId(e.target.value);
              setPage(1);
            }}
            options={eventOptions}
            className="min-w-[160px]"
          />
          <Select
            label="Market Type"
            value={marketTypeCode}
            onChange={(e) => {
              setMarketTypeCode(e.target.value);
              setPage(1);
            }}
            options={marketTypeOptions}
            className="min-w-[180px]"
          />
          <Input
            label="Stake: From"
            inputMode="decimal"
            placeholder="All"
            value={stakeFrom}
            onChange={(e) => {
              setStakeFrom(e.target.value);
              setPage(1);
            }}
            className="max-w-[140px]"
          />
          <Input
            label="Stake: To"
            inputMode="decimal"
            placeholder="All"
            value={stakeTo}
            onChange={(e) => {
              setStakeTo(e.target.value);
              setPage(1);
            }}
            className="max-w-[140px]"
          />
          <Input
            label="Member Name"
            placeholder="All"
            value={memberName}
            onChange={(e) => {
              setMemberName(e.target.value);
              setPage(1);
            }}
            className="min-w-[180px]"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              type="button"
              onClick={() => {
                setPage(1);
                setRefreshKey((k) => k + 1);
              }}
            >
              Apply
            </Button>
            <Button variant="outline" type="button" onClick={onClear}>
              Clear
            </Button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
            >
              Refresh
            </Button>
            <span className="text-xs text-muted">
              {wsConnected ? (wsAuthed ? "Live: connected" : "Live: authenticating…") : "Live: disconnected"}
            </span>
            {wsLastError ? (
              <span className="max-w-[280px] truncate text-xs text-error" title={wsLastError}>
                {wsLastError}
              </span>
            ) : null}
            {wsLastClose ? (
              <span className="max-w-[280px] truncate text-xs text-muted" title={wsLastClose}>
                {wsLastClose}
              </span>
            ) : null}
          </div>
          </FilterBar>

          <ListTableSection>
            <Table>
          <TableHeader>
            <TableHead>Member</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Market Name</TableHead>
            <TableHead>Selection</TableHead>
            <TableHead align="right">Odd Req.</TableHead>
            <TableHead align="right">Avg. Matched</TableHead>
            <TableHead align="right">Matched</TableHead>
            <TableHead align="right">Unmatched</TableHead>
            <TableHead align="right">Profit/Liability</TableHead>
            <TableHead>IP</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableEmpty colSpan={11} message="Loading…" />
            ) : rows.length === 0 ? (
              <TableEmpty colSpan={11} message="No live bets." />
            ) : (
              rows.map((r, i) => {
                const user = (r.user ?? {}) as Record<string, unknown>;
                const market = (r.market ?? {}) as Record<string, unknown>;
                const event = (market.event ?? {}) as Record<string, unknown>;

                const member = String(user.username ?? user.userCode ?? "—");
                const eventName = String(event.name ?? "—");
                const marketName = String(market.name ?? "—");
                const selection = String(r.runnerName ?? "—");
                const oddReq = Number(r.price ?? 0);
                const avgMatched = Number(r.avgPrice ?? r.avgMatched ?? 0);
                const matched = Number(r.sizeMatched ?? 0);
                const unmatched = Number(r.sizeRemaining ?? 0);
                const pnl = Number(r.pl ?? r.profitLiability ?? 0);
                const ip = String(r.remoteIp ?? "—");
                const updated = formatDateTime(r.createdOn ?? r.updatedOn ?? r.createdAt);

                return (
                  <TableRow key={String(r.id ?? r.betId ?? i)}>
                    <TableCell>{member}</TableCell>
                    <TableCell>{eventName}</TableCell>
                    <TableCell>{marketName}</TableCell>
                    <TableCell>{selection}</TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {oddReq ? String(oddReq) : "—"}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {avgMatched ? String(avgMatched) : "—"}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {formatCurrency(matched)}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {formatCurrency(unmatched)}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {formatCurrency(pnl)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{ip}</TableCell>
                    <TableCell className="whitespace-nowrap">{updated}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
            </Table>

            {!loading && total > 0 ? (
              <div className="border-t border-border px-4 py-3">
                <TablePagination
                  page={page}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                  }}
                />
              </div>
            ) : null}
          </ListTableSection>
        </div>
      </ListPageFrame>
    </div>
  );
}
