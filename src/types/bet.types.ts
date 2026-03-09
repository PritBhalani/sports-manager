/** README §4 Bet, §5 Bet History */
import type { ApiListResponse } from "./api.types";

export type LiveBetSearchQuery = {
  fromDate?: string;
  toDate?: string;
  status?: string;
  eventTypeId?: string;
  marketTypeCode?: string;
  eventName?: string;
  oddsfrom?: number;
  oddsto?: number;
  stakefrom?: number;
  staketo?: number;
  side?: string;
  inplay?: boolean;
};

export type BetHistorySearchQuery = LiveBetSearchQuery;

export type LiveBetRecord = Record<string, unknown>;
export type BetHistoryRecord = Record<string, unknown>;

export type LiveBetsResponse = ApiListResponse<LiveBetRecord>;
export type BetHistoryResponse = ApiListResponse<BetHistoryRecord>;
