/** README §4 Bet, §5 Bet History */
import type { ApiListResponse } from "./api.types";

export type LiveBetSearchQuery = {
  fromDate?: string;
  toDate?: string;
  status?: string;
  eventTypeId?: string;
  marketTypeCode?: string;
  eventName?: string;
  /** Filter live bets by member login (POST /bet/getlivebets). */
  username?: string;
  /** Scope live bets to one event (e.g. POST /bet/getlivebetsbyeventid). */
  eventId?: string;
  /** Optional: narrow event-scoped live bets to one market (omit = all markets). */
  marketId?: string;
  oddsfrom?: number;
  oddsto?: number;
  stakefrom?: number;
  staketo?: number;
  /** Often `"1"` = Back, `"2"` = Lay, `"-1"` = all sides (see sports bet list). */
  side?: string;
  inplay?: boolean;
};

export type BetHistorySearchQuery = LiveBetSearchQuery;

export type LiveBetRecord = Record<string, unknown>;
export type BetHistoryRecord = Record<string, unknown>;

export type LiveBetsResponse = ApiListResponse<LiveBetRecord>;
export type BetHistoryResponse = ApiListResponse<BetHistoryRecord>;
