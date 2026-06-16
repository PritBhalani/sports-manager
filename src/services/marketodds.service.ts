/** Market odds — extended markets (Fancy / session) for an event */
import { apiGet, apiPost } from "./apiClient";
import type { MarketByEventMarket } from "./position.service";

export interface MultiMarketOddsRunner {
  status: number;
  backPrice: { price: number; size: number }[];
  layPrice: { price: number; size: number }[];
  displayOrder: number;
  runner: {
    id: string;
    sourceId?: number;
    name: string;
    runnerMetadata?: string;
  };
}

export interface MultiMarketOddsRecord {
  id: number;
  marketStatus: number;
  temporaryStatus: number;
  inPlay: boolean;
  bettingType: number;
  marketRunner: MultiMarketOddsRunner[];
  scoreSource?: number;
  syncData?: boolean;
  version?: number;
}

/** POST /marketodds/getmultimarketodds — fetch odds for multiple markets. Auth: Session. */
export async function getMultiMarketOdds(
  marketIds: number[],
  depth = 3
): Promise<MultiMarketOddsRecord[]> {
  const res = await apiPost<{ data?: MultiMarketOddsRecord[] }>(
    "/marketodds/getmultimarketodds",
    { depth, marketIds }
  );
  return res?.data ?? [];
}

export type OtherMarketGroup = {
  group?: number;
  markets?: MarketByEventMarket[];
};

type Envelope<T> = { data?: T; success?: boolean };

/**
 * GET /marketodds/othermarketbyeventid/{eventId}/{matchOddsMarketId}
 * Returns grouped “other” markets (e.g. Fancy). Second path segment is the Match Odds market id.
 */
export async function getOtherMarketsByEventAndMatchOddsId(
  eventId: string,
  matchOddsMarketId: string,
): Promise<MarketByEventMarket[]> {
  const path = `/marketodds/othermarketbyeventid/${encodeURIComponent(eventId)}/${encodeURIComponent(matchOddsMarketId)}`;
  const raw = await apiGet<
    OtherMarketGroup[] | Envelope<OtherMarketGroup[]>
  >(path);
  const groups: OtherMarketGroup[] | undefined = Array.isArray(raw)
    ? raw
    : raw?.data;
  if (!Array.isArray(groups)) return [];
  const out: MarketByEventMarket[] = [];
  for (const g of groups) {
    if (g?.markets?.length) out.push(...g.markets);
  }
  return out;
}
