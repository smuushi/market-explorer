import { searchPolymarketMarkets } from "@/lib/polymarket";
import { searchKalshiMarkets } from "@/lib/kalshi";
import { extractKeywords } from "@/lib/text";
import type { Market } from "@/lib/types";

const DEFAULT_SUGGESTION_LIMIT = 5;

/**
 * Given a resolved market on one platform, find the best candidate matches
 * on the other platform, ranked best-first.
 */
export async function findMatchesForMarket(
  market: Market,
  limit = DEFAULT_SUGGESTION_LIMIT,
): Promise<Market[]> {
  if (market.platform === "polymarket") {
    return searchKalshiMarkets(market.title, limit);
  }

  const query = extractKeywords(market.title).join(" ");
  return searchPolymarketMarkets(query || market.title, limit);
}
