import { parsePolymarketUrl, resolvePolymarketUrl } from "@/lib/polymarket";
import { parseKalshiUrl, resolveKalshiUrl } from "@/lib/kalshi";
import type { Market } from "@/lib/types";
import { MarketResolutionError } from "@/lib/types";

export interface Resolution {
  market: Market;
  alternates: Market[];
}

export async function resolveMarketUrl(url: string): Promise<Resolution> {
  if (parsePolymarketUrl(url)) {
    return resolvePolymarketUrl(url);
  }
  if (parseKalshiUrl(url)) {
    return resolveKalshiUrl(url);
  }
  throw new MarketResolutionError(
    "Paste a link from polymarket.com or kalshi.com, e.g. https://polymarket.com/event/... or https://kalshi.com/markets/...",
  );
}
