/** Market odds — extended markets (Fancy / session) for an event */
import { apiGet } from "./apiClient";
import type { MarketByEventMarket } from "./position.service";

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
