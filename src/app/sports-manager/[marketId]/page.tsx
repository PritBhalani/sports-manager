"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Wifi, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { SidebarMarketRecord } from "@/services/market.service";

interface ShortcutState {
  Q_plus: string;
  W_plus: string;
  E_plus: string;
  R_plus: string;
  T_plus: string;
  Y_plus: string;
  U_plus: string;
  I_plus: string;
  Z: string;
  X: string;
  C: string;
  V: string;
  B: string;
  N: string;
  M: string;
  DOT: string;
}

export default function MarketDetailPage() {
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const dataParam = searchParams.get("data");

  const [market, setMarket] = useState<SidebarMarketRecord | null>(null);
  const [eventName, setEventName] = useState<string>("India v Afghanistan");

  const [inPlay, setInPlay] = useState(false);
  const [temporaryStatus, setTemporaryStatus] = useState(1);
  const [marketStatus, setMarketStatus] = useState(1);
  const [autoOpenSec, setAutoOpenSec] = useState(3);
  const [isAutoOpenEnabled, setIsAutoOpenEnabled] = useState(false);

  const [isSaved, setIsSaved] = useState(false);

  // Shortcut key bindings state
  const [shortcuts, setShortcuts] = useState<ShortcutState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("market_shortcuts");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return {
      Q_plus: "1",
      W_plus: "2",
      E_plus: "3",
      R_plus: "4",
      T_plus: "5",
      Y_plus: "7",
      U_plus: "10",
      I_plus: "15",
      Z: "85",
      X: "88",
      C: "90",
      V: "93",
      B: "95",
      N: "96",
      M: "",
      DOT: "",
    };
  });

  // Client-side authentication check
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAuthenticated) return;
    const path = `${window.location.pathname}${window.location.search}`;
    const login = `/login?next=${encodeURIComponent(path)}`;
    window.location.replace(login);
  }, [isAuthenticated]);

  // Load market data from URL query params
  useEffect(() => {
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        if (parsed.market) {
          setMarket(parsed.market);
          
          const isFancy = parsed.market.name.toLowerCase().includes("khado") || parsed.market.bettingType === 8;
          const isOddEven = parsed.market.name.toLowerCase().includes("odd even") || parsed.market.bettingType === 6;
          
          setInPlay(isFancy ? true : false);
          setTemporaryStatus(isFancy ? 4 : 1);
          setMarketStatus(isFancy ? 3 : (isOddEven ? 2 : 1));
        }
        if (parsed.eventName) {
          setEventName(parsed.eventName);
        }
      } catch (err) {
        console.error("Failed to parse market query parameter:", err);
      }
    }
  }, [dataParam]);

  const handleShortcutChange = (key: keyof ShortcutState, val: string) => {
    setShortcuts((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveShortcuts = () => {
    localStorage.setItem("market_shortcuts", JSON.stringify(shortcuts));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const getRunnerStatusBadge = (runnerStatus: number) => {
    if (marketStatus === 3) return "SUSPENED";
    if (temporaryStatus === 2) return "BALL";
    if (temporaryStatus === 3) return "STOPBETTING";
    if (marketStatus === 4) return "CLOSED";
    if (runnerStatus === 2) return "SUSPENED";
    return null;
  };

  if (!market) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Loading market details...</p>
      </div>
    );
  }

  const minPrice = market.minPrice ?? 1;
  const maxPrice = market.maxPrice ?? (market.id === 2024686 ? 300 : 150);
  const maxBet = market.maxBet ?? 250;
  const betDelay = market.betDelay ?? 0;
  const ladder = market.priceLadderType === 3 ? "Line_Range" : "Standard";
  const allowLimit = `${market.allowLimit === true}/${market.allowLimitMarket === true}`;
  const limitsText = `Min Price: ${minPrice} || Max Price: ${maxPrice} || Max Bet: ${maxBet} || Bet Delay: ${betDelay} || Ladder: ${ladder} || Allow Limit: ${allowLimit}`;

  const runners = market.marketRunner ?? [];

  const keys1: { key: keyof ShortcutState; label: string }[] = [
    { key: "Q_plus", label: "Q+=" },
    { key: "W_plus", label: "W+=" },
    { key: "E_plus", label: "E+=" },
    { key: "R_plus", label: "R+=" },
    { key: "T_plus", label: "T+=" },
    { key: "Y_plus", label: "Y+=" },
    { key: "U_plus", label: "U+=" },
    { key: "I_plus", label: "I+=" },
  ];

  const keys2: { key: keyof ShortcutState; label: string }[] = [
    { key: "Z", label: "Z=" },
    { key: "X", label: "X=" },
    { key: "C", label: "C=" },
    { key: "V", label: "V=" },
    { key: "B", label: "B=" },
    { key: "N", label: "N=" },
    { key: "M", label: "M=" },
    { key: "DOT", label: "DOT=" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 select-none flex flex-col font-sans">
      {/* Keyboard Shortcuts Header Bar */}
      <div className="bg-[#12303c] text-white px-6 py-4 flex flex-col gap-3 border-b border-[#0d222b]">
        <div className="flex flex-col gap-2">
          {/* Row 1 */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {keys1.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-300 min-w-[32px]">{item.label}</span>
                <input
                  type="text"
                  value={shortcuts[item.key]}
                  onChange={(e) => handleShortcutChange(item.key, e.target.value)}
                  className="w-10 bg-white text-zinc-900 text-xs px-1.5 py-0.5 rounded-xs font-semibold border-none outline-hidden text-center"
                />
              </div>
            ))}
          </div>

          {/* Row 2 */}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {keys2.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-300 min-w-[32px]">{item.label}</span>
                <input
                  type="text"
                  value={shortcuts[item.key]}
                  onChange={(e) => handleShortcutChange(item.key, e.target.value)}
                  className="w-10 bg-white text-zinc-900 text-xs px-1.5 py-0.5 rounded-xs font-semibold border-none outline-hidden text-center"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save shortcuts action */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSaveShortcuts}
            className="bg-[#0cf] hover:bg-[#00b2db] text-[#12303c] font-bold px-6 py-1 text-xs rounded-xs shadow-xs transition-colors cursor-pointer"
          >
            Save
          </button>
          {isSaved && (
            <span className="text-xs font-semibold text-emerald-400 animate-pulse">
              Shortcuts saved successfully!
            </span>
          )}
        </div>
      </div>

      {/* Main Single Market Control Card */}
      <div className="flex-1 p-0 flex flex-col">
        <div className="bg-zinc-50 flex flex-col flex-1">
          <div className="border-b border-border bg-surface flex flex-col flex-1">
            {/* Header */}
            <div className="bg-zinc-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center flex-wrap gap-y-1 min-w-0 pr-4">
                {/* Trophy indicator */}
                <span className="w-3.5 h-3.5 bg-emerald-500 rounded-xs inline-block mr-2.5 shrink-0" />
                <span className="text-sm font-bold truncate pr-3" title={market.name}>
                  {market.name}
                </span>
                {/* Event Badge */}
                <span className="bg-white text-zinc-900 px-2 py-0.5 text-[11px] font-bold rounded-sm border border-zinc-200 shadow-xs shrink-0 select-none">
                  {eventName}
                </span>
                {/* detail limits text */}
                <span className="text-[11px] text-zinc-400 ml-4 hidden md:inline truncate select-none">
                  {limitsText}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => { }}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Refresh panel data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-4 bg-surface flex-1">
              {/* Left Column (Span 2) */}
              <div className="xl:col-span-2 flex flex-col gap-4">
                {/* Inputs Row 1 */}
                <div className="flex gap-4 flex-wrap">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
                    <label className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">From</label>
                    <input
                      type="text"
                      placeholder="from price"
                      className="border border-border rounded px-3 py-1.5 text-sm bg-surface-muted focus:bg-surface focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
                    <label className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">To</label>
                    <input
                      type="text"
                      placeholder="to price"
                      className="border border-border rounded px-3 py-1.5 text-sm bg-surface-muted focus:bg-surface focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
                    <label className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">Back</label>
                    <input
                      type="text"
                      placeholder="back size"
                      className="border border-border rounded px-3 py-1.5 text-sm bg-surface-muted focus:bg-surface focus:outline-hidden transition-colors"
                    />
                  </div>
                  {market.bettingType !== 8 && market.bettingType !== 6 && (
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
                      <label className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">Lay</label>
                      <input
                        type="text"
                        placeholder="lay size"
                        className="border border-border rounded px-3 py-1.5 text-sm bg-surface-muted focus:bg-surface focus:outline-hidden transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Inputs Row 2 */}
                <div className="flex gap-4 flex-wrap items-center">
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground-secondary uppercase tracking-wider shrink-0 mt-5 cursor-pointer">
                    <input type="checkbox" className="rounded border-border h-4 w-4" />
                    Consider %
                  </label>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[80px]">
                    <label className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">1st %</label>
                    <input
                      type="text"
                      placeholder="1st %"
                      className="border border-border rounded px-3 py-1.5 text-sm bg-surface-muted focus:bg-surface focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[80px]">
                    <label className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">2nd %</label>
                    <input
                      type="text"
                      placeholder="2nd %"
                      className="border border-border rounded px-3 py-1.5 text-sm bg-surface-muted focus:bg-surface focus:outline-hidden transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[80px]">
                    <label className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">3rd %</label>
                    <input
                      type="text"
                      placeholder="3rd %"
                      className="border border-border rounded px-3 py-1.5 text-sm bg-surface-muted focus:bg-surface focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                {/* Dynamic Runner Inputs */}
                <div className="flex flex-col gap-3">
                  {runners.map((runnerObj, idx) => {
                    const runnerName = runnerObj.runner?.name ?? `Runner ${idx + 1}`;
                    const isLast = idx === runners.length - 1;
                    return (
                      <div key={runnerObj.runner?.id || idx} className="flex items-center gap-3 w-full">
                        <div className="flex flex-1 items-stretch h-9">
                          <span className="bg-zinc-100 border border-r-0 border-zinc-300 px-3 flex items-center justify-center text-xs font-bold text-zinc-600 rounded-l min-w-[120px] select-none uppercase truncate" title={runnerName}>
                            {runnerName}
                          </span>
                          <input
                            type="text"
                            placeholder="price"
                            className="border border-zinc-300 rounded-r px-3 py-1.5 text-sm bg-white focus:outline-hidden focus:border-zinc-500 transition-colors flex-1"
                          />
                        </div>
                        {isLast && (
                          <div className="flex gap-2 shrink-0 h-9">
                            <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-1.5 text-sm font-semibold rounded shadow-xs transition-colors cursor-pointer flex items-center justify-center min-w-[120px]">
                              Start
                            </button>
                            <button className="border border-zinc-300 rounded p-2 hover:bg-zinc-100 transition-colors text-zinc-600 cursor-pointer flex items-center justify-center w-9">
                              <Wifi className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Divider */}
                <hr className="border-t border-border mt-2" />

                {/* Ladder row */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border pb-1 select-none">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider flex-1">Runner</span>

                    <div className="w-[180px] flex justify-center shrink-0">
                      <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Status</span>
                    </div>

                    <div className="w-[294px] flex gap-1.5 shrink-0">
                      <div className="w-[144px] bg-sky-100 text-sky-800 text-[10px] font-bold py-0.5 rounded-t text-center uppercase tracking-wider">
                        Back
                      </div>
                      <div className="w-[144px] bg-rose-100 text-rose-800 text-[10px] font-bold py-0.5 rounded-t text-center uppercase tracking-wider">
                        Lay
                      </div>
                    </div>
                  </div>

                  {runners.map((runnerObj, idx) => {
                    const runnerName = runnerObj.runner?.name ?? `Runner ${idx + 1}`;
                    const statusBadge = getRunnerStatusBadge(runnerObj.status);

                    const hasOdds = !statusBadge || statusBadge === "SUSPENED";
                    const isFancy = market.name.toLowerCase().includes("khado") || market.bettingType === 8;
                    const isOddEven = market.name.toLowerCase().includes("odd even") || market.bettingType === 6;

                    let backOdds: any = undefined;
                    let layOdds: any = undefined;

                    if (hasOdds) {
                      if (isFancy) {
                        backOdds = { price: 140.0, size: 5000.0 };
                      } else if (isOddEven) {
                        backOdds = { price: 1.95, size: 5000.0 };
                      }
                    }

                    return (
                      <div key={runnerObj.runner?.id || idx} className="flex items-center justify-between gap-4 py-1.5 border-b border-border border-dashed last:border-0">
                        <span className="text-sm font-bold text-foreground-secondary uppercase tracking-wider flex-1 truncate" title={runnerName}>
                          {runnerName}
                        </span>

                        {/* Status badge */}
                        <div className="w-[180px] flex justify-center shrink-0">
                          {statusBadge ? (
                            <div className="border border-red-200 bg-red-50 text-red-600 px-6 py-1 text-[10px] font-bold uppercase rounded tracking-wider text-center shrink-0 select-none">
                              {statusBadge}
                            </div>
                          ) : (
                            <span className="text-zinc-300 text-xs select-none">—</span>
                          )}
                        </div>

                        {/* Ladder columns */}
                        <div className="w-[294px] flex gap-1.5 shrink-0">
                          {/* Back columns */}
                          <div className="w-11 h-11 rounded bg-sky-50/50 border border-sky-100/50"></div>
                          <div className="w-11 h-11 rounded bg-sky-50/50 border border-sky-100/50"></div>
                          <div className="w-11 h-11 rounded bg-sky-100 border border-sky-200 flex flex-col items-center justify-center shadow-2xs select-none">
                            {backOdds ? (
                              <>
                                <span className="text-xs font-bold text-sky-800 leading-tight">{backOdds.price}</span>
                                <span className="text-[9px] text-sky-600 font-semibold leading-none">{backOdds.size?.toLocaleString()}</span>
                              </>
                            ) : (
                              <span className="text-zinc-300 text-xs">—</span>
                            )}
                          </div>

                          {/* Lay columns */}
                          <div className="w-11 h-11 rounded bg-rose-100 border border-rose-200 flex flex-col items-center justify-center shadow-2xs select-none">
                            {layOdds ? (
                              <>
                                <span className="text-xs font-bold text-rose-800 leading-tight">{layOdds.price}</span>
                                <span className="text-[9px] text-rose-600 font-semibold leading-none">{layOdds.size?.toLocaleString()}</span>
                              </>
                            ) : (
                              <span className="text-zinc-300 text-xs">—</span>
                            )}
                          </div>
                          <div className="w-11 h-11 rounded bg-rose-50/50 border border-rose-100/50"></div>
                          <div className="w-11 h-11 rounded bg-rose-50/50 border border-rose-100/50"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column (Span 1) */}
              <div className="flex flex-col gap-5 border-l border-border xl:pl-6 pt-4 xl:pt-0">
                {/* Select list with current market name */}
                <div>
                  <select className="w-full border border-zinc-300 rounded px-3 py-2 bg-white text-sm font-semibold focus:outline-hidden">
                    <option>{market.name}</option>
                  </select>
                </div>

                {/* Inplay Status */}
                <div>
                  <span className="block text-[11px] font-bold text-foreground-secondary mb-2 uppercase tracking-wider">
                    Inplay Status
                  </span>
                  <div className="flex">
                    <button
                      onClick={() => setInPlay(true)}
                      className={`px-4 py-1 text-xs font-bold rounded-l border border-border cursor-pointer transition-colors ${inPlay === true
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-surface text-foreground-secondary hover:bg-surface-2"
                        }`}
                    >
                      true
                    </button>
                    <button
                      onClick={() => setInPlay(false)}
                      className={`px-4 py-1 text-xs font-bold rounded-r border-t border-b border-r border-border cursor-pointer transition-colors ${inPlay === false
                        ? "bg-zinc-900 text-white border-zinc-900"
                        : "bg-surface text-foreground-secondary hover:bg-surface-2"
                        }`}
                    >
                      false
                    </button>
                  </div>
                </div>

                {/* Temporary Status */}
                <div>
                  <span className="block text-[11px] font-bold text-foreground-secondary mb-2 uppercase tracking-wider">
                    Temporary Status
                  </span>
                  <div className="flex flex-wrap gap-px bg-border rounded border border-border overflow-hidden max-w-fit">
                    {[
                      { label: "OPEN", val: 1 },
                      { label: "BALL", val: 2 },
                      { label: "STOPBETTING", val: 3 },
                      { label: "SUSPEND", val: 4 },
                    ].map((tOpt) => (
                      <button
                        key={tOpt.val}
                        onClick={() => setTemporaryStatus(tOpt.val)}
                        className={`px-3 py-1 text-[10px] font-bold cursor-pointer transition-colors ${temporaryStatus === tOpt.val
                          ? "bg-zinc-900 text-white"
                          : "bg-surface text-foreground-secondary hover:bg-surface-2"
                          }`}
                      >
                        {tOpt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Market Status */}
                <div>
                  <span className="block text-[11px] font-bold text-foreground-secondary mb-2 uppercase tracking-wider">
                    Market Status
                  </span>
                  <div className="flex flex-wrap gap-px bg-border rounded border border-border overflow-hidden max-w-fit">
                    {[
                      { label: "INACTIVE", val: 2 },
                      { label: "OPEN", val: 1 },
                      { label: "SUSPENDED", val: 3 },
                      { label: "CLOSED", val: 4 },
                    ].map((mOpt) => (
                      <button
                        key={mOpt.val}
                        onClick={() => setMarketStatus(mOpt.val)}
                        className={`px-3 py-1 text-[10px] font-bold cursor-pointer transition-colors ${marketStatus === mOpt.val
                          ? "bg-zinc-900 text-white"
                          : "bg-surface text-foreground-secondary hover:bg-surface-2"
                          }`}
                      >
                        {mOpt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Open In */}
                <div className="flex items-center gap-2 mt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground-secondary uppercase tracking-wider cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAutoOpenEnabled}
                      onChange={() => setIsAutoOpenEnabled(!isAutoOpenEnabled)}
                      className="rounded border-border h-4 w-4"
                    />
                    Start Auto Open In
                  </label>
                  <input
                    type="number"
                    value={autoOpenSec}
                    onChange={(e) => setAutoOpenSec(parseInt(e.target.value) || 0)}
                    className="border border-border rounded w-12 text-center py-0.5 text-xs font-semibold bg-surface-muted focus:bg-surface focus:outline-hidden transition-colors"
                  />
                  <span className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
                    Sec
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
