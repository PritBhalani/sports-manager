"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getEventType, searchEvents, EventTypeRecord, EventRecord } from "@/services/eventtype.service";
import { getMarketByEventId, SidebarMarketRecord } from "@/services/market.service";
import { ChevronRight, RefreshCw, Loader2, PlusCircle, MinusCircle, ExternalLink } from "lucide-react";

interface SportSidebarProps {
  selectedSport: EventTypeRecord | null;
  setSelectedSport: (sport: EventTypeRecord | null) => void;
  selectedEvent: EventRecord | null;
  setSelectedEvent: (event: EventRecord | null) => void;
  openMarketIds: number[];
  onToggleMarket: (market: SidebarMarketRecord) => void;
}

export function SportSidebar({
  selectedSport,
  setSelectedSport,
  selectedEvent,
  setSelectedEvent,
  openMarketIds,
  onToggleMarket,
}: SportSidebarProps) {
  const [sports, setSports] = useState<EventTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [isEventsRefreshing, setIsEventsRefreshing] = useState(false);

  const [markets, setMarkets] = useState<SidebarMarketRecord[]>([]);
  const [isMarketsLoading, setIsMarketsLoading] = useState(false);
  const [isMarketsRefreshing, setIsMarketsRefreshing] = useState(false);

  const fetchSports = useCallback(async (isSilentRefresh = false) => {
    try {
      if (!isSilentRefresh) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      const data = await getEventType();
      
      // Filter out Session and Casino event types
      const filteredData = data.filter(
        (sport) => sport.name !== "Session" && sport.name !== "Casino"
      );
      
      // Sort by displayOrder if available
      const sortedData = [...filteredData].sort((a, b) => {
        const orderA = a.displayOrder ?? 999;
        const orderB = b.displayOrder ?? 999;
        return orderA - orderB;
      });
      
      setSports(sortedData);
    } catch (error) {
      console.error("Failed to fetch sports:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchEvents = useCallback(async (sportId: string, isSilentRefresh = false) => {
    try {
      if (!isSilentRefresh) {
        setIsEventsLoading(true);
      } else {
        setIsEventsRefreshing(true);
      }
      
      const data = await searchEvents(sportId);
      setEvents(data);
    } catch (error) {
      console.error(`Failed to fetch events for sport ${sportId}:`, error);
    } finally {
      setIsEventsLoading(false);
      setIsEventsRefreshing(false);
    }
  }, []);

  const fetchMarkets = useCallback(async (eventId: string, isSilentRefresh = false) => {
    try {
      if (!isSilentRefresh) {
        setIsMarketsLoading(true);
      } else {
        setIsMarketsRefreshing(true);
      }
      
      const data = await getMarketByEventId(eventId);
      
      // Sort by displayOrder if available
      const sortedData = [...data].sort((a, b) => {
        const orderA = a.displayOrder ?? 99999;
        const orderB = b.displayOrder ?? 99999;
        return orderA - orderB;
      });
      
      setMarkets(sortedData);
    } catch (error) {
      console.error(`Failed to fetch markets for event ${eventId}:`, error);
    } finally {
      setIsMarketsLoading(false);
      setIsMarketsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSports();
  }, [fetchSports]);

  // Reactively fetch events when selectedSport changes
  useEffect(() => {
    if (selectedSport && !selectedEvent) {
      fetchEvents(selectedSport.id);
    }
  }, [selectedSport, selectedEvent, fetchEvents]);

  // Reactively fetch markets when selectedEvent changes
  useEffect(() => {
    if (selectedEvent) {
      fetchMarkets(selectedEvent.id);
    }
  }, [selectedEvent, fetchMarkets]);

  const handleRefresh = useCallback(() => {
    if (selectedEvent) {
      fetchMarkets(selectedEvent.id, true);
    } else if (selectedSport) {
      fetchEvents(selectedSport.id, true);
    } else {
      fetchSports(true);
    }
  }, [selectedSport, selectedEvent, fetchEvents, fetchSports, fetchMarkets]);

  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };

  const isAnyRefreshing = isRefreshing || isEventsRefreshing || isMarketsRefreshing;
  const isAnyLoading = isLoading || isEventsLoading || isMarketsLoading;

  return (
    <div className="flex w-64 flex-col border-r border-border bg-surface overflow-hidden shrink-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between bg-zinc-900 text-white px-4 py-3 border-b border-zinc-800">
        <h2 className="text-sm font-bold text-white">
          Sport
        </h2>
        <button
          onClick={handleRefresh}
          className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Refresh"
          disabled={isAnyLoading || isAnyRefreshing}
        >
          <RefreshCw className={`w-4 h-4 ${isAnyRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {selectedSport ? (
          <>
            {/* Selected Sport Title (Back link) */}
            <div className="border-b border-zinc-800 bg-zinc-800">
              <button
                onClick={() => {
                  setSelectedSport(null);
                  setSelectedEvent(null);
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                {selectedSport.name}
              </button>
            </div>

            {selectedEvent ? (
              <>
                {/* Selected Event Title (Back link) */}
                <div className="border-b border-border bg-zinc-100/80">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-primary hover:underline transition-colors cursor-pointer"
                  >
                    {selectedEvent.name}
                  </button>
                </div>

                {isMarketsLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted" />
                  </div>
                ) : markets.length === 0 ? (
                  <div className="p-4 text-sm text-center text-muted">
                    No markets found.
                  </div>
                ) : (
                  <ul className="flex flex-col">
                    {markets.map((market, index) => {
                      const isOpen = openMarketIds.includes(market.id);
                      return (
                        <li 
                          key={market.id}
                          className={`group ${
                            index !== markets.length - 1 ? "border-b border-border" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors">
                            <div className="flex items-center gap-1.5 min-w-0 pr-4">
                              <span className="text-sm font-medium text-foreground-secondary group-hover:text-foreground truncate" title={market.name}>
                                {market.name}
                              </span>
                              <Link
                                href={`/sports-manager/${market.id}?data=${encodeURIComponent(
                                  JSON.stringify({
                                    market,
                                    eventName: selectedEvent?.name || "India v Afghanistan",
                                  })
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer"
                                onClick={(e) => {
                                  // Prevent selecting the row when clicking the link
                                  e.stopPropagation();
                                }}
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                            </div>
                            <button
                              onClick={() => onToggleMarket(market)}
                              className="text-primary hover:text-primary-hover transition-colors shrink-0 cursor-pointer"
                              title={isOpen ? "Remove market" : "Add market"}
                            >
                              {isOpen ? (
                                <MinusCircle className="w-5 h-5" />
                              ) : (
                                <PlusCircle className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            ) : (
              <>
                {isEventsLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-4 text-sm text-center text-muted">
                    No events found.
                  </div>
                ) : (
                  <ul className="flex flex-col">
                    {events.map((event, index) => (
                      <li 
                        key={event.id}
                        className={`group cursor-pointer ${
                          index !== events.length - 1 ? "border-b border-border" : ""
                        }`}
                        onClick={() => {
                          setSelectedEvent(event);
                        }}
                      >
                        <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors">
                          <div className="flex flex-col gap-1 pr-4 min-w-0">
                            <span className="text-sm font-medium text-foreground-secondary group-hover:text-foreground truncate" title={event.name}>
                              {event.name}
                            </span>
                            <span className="text-xs text-muted">
                              {formatEventDate(event.openDate)}
                            </span>
                          </div>
                          <button
                            className="flex items-center justify-center w-6 h-6 rounded border border-border bg-surface shadow-xs text-foreground-secondary hover:text-foreground hover:bg-surface-2 transition-all shrink-0 cursor-pointer"
                            title="View details"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted" />
              </div>
            ) : sports.length === 0 ? (
              <div className="p-4 text-sm text-center text-muted">
                No sports found.
              </div>
            ) : (
              <ul className="flex flex-col">
                {sports.map((sport, index) => (
                  <li 
                    key={sport.id}
                    className={`group cursor-pointer ${
                      index !== sports.length - 1 ? "border-b border-border" : ""
                    }`}
                    onClick={() => {
                      setSelectedSport(sport);
                    }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors">
                      <span className="text-sm font-medium text-foreground-secondary group-hover:text-foreground">
                        {sport.name}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted group-hover:text-foreground" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
