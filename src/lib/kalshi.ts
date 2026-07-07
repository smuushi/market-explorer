import { titleSimilarity } from "@/lib/text";
import type { Market, PricePoint } from "@/lib/types";
import { MarketResolutionError } from "@/lib/types";

const TRADE_API_BASE = "https://external-api.kalshi.com/trade-api/v2";
const REVALIDATE_SECONDS = 30;
const CANDLESTICK_LOOKBACK_SECONDS = 60 * 60 * 24 * 7;
const CANDLESTICK_PERIOD_MINUTES = 60;

interface KalshiMarketRaw {
  ticker: string;
  event_ticker: string;
  title: string;
  yes_sub_title?: string;
  status?: string;
  close_time?: string;
  last_price_dollars?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  no_bid_dollars?: string;
  no_ask_dollars?: string;
  volume_fp?: string;
  volume_24h_fp?: string;
  open_interest_fp?: string;
  liquidity_dollars?: string;
  rules_primary?: string;
}

interface KalshiEventRaw {
  event_ticker: string;
  series_ticker: string;
  title: string;
  category?: string;
  markets?: KalshiMarketRaw[];
}

interface KalshiSeriesRaw {
  ticker: string;
  title: string;
  category: string;
}

function toNumber(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function parseKalshiUrl(url: string): string[] | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.hostname.includes("kalshi.com")) return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments[0] !== "markets" || segments.length < 2) return null;

  const candidates = [segments[segments.length - 1], segments[1]].map((segment) =>
    segment.toUpperCase(),
  );
  return Array.from(new Set(candidates));
}

async function fetchMarketByTicker(ticker: string): Promise<KalshiMarketRaw | null> {
  const data = await fetchJson<{ market: KalshiMarketRaw }>(`${TRADE_API_BASE}/markets/${ticker}`);
  return data?.market ?? null;
}

async function fetchEventByTicker(
  ticker: string,
): Promise<{ event: KalshiEventRaw; markets: KalshiMarketRaw[] } | null> {
  const data = await fetchJson<{ event: KalshiEventRaw; markets: KalshiMarketRaw[] }>(
    `${TRADE_API_BASE}/events/${ticker}?with_nested_markets=true`,
  );
  if (!data?.event) return null;
  return { event: data.event, markets: data.markets ?? data.event.markets ?? [] };
}

async function fetchCandlesticks(
  seriesTicker: string,
  marketTicker: string,
): Promise<PricePoint[]> {
  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - CANDLESTICK_LOOKBACK_SECONDS;
  const url = `${TRADE_API_BASE}/series/${seriesTicker}/markets/${marketTicker}/candlesticks?start_ts=${startTs}&end_ts=${endTs}&period_interval=${CANDLESTICK_PERIOD_MINUTES}`;
  const data = await fetchJson<{
    candlesticks?: Array<{ end_period_ts: number; price?: { close_dollars?: string } }>;
  }>(url);
  if (!data?.candlesticks) return [];

  return data.candlesticks
    .map((candle) => ({
      timestamp: candle.end_period_ts,
      price: toNumber(candle.price?.close_dollars) ?? 0,
    }))
    .filter((point) => point.price > 0);
}

function mapStatus(status: string | undefined): Market["status"] {
  if (status === "active" || status === "open" || status === "unopened") return "open";
  if (status === "closed" || status === "paused") return "closed";
  if (status === "settled" || status === "finalized") return "settled";
  return "unknown";
}

async function normalizeMarket(
  raw: KalshiMarketRaw,
  event?: KalshiEventRaw,
  includeHistory = true,
): Promise<Market> {
  const lastPrice = toNumber(raw.last_price_dollars);
  const yesBid = toNumber(raw.yes_bid_dollars);
  const yesAsk = toNumber(raw.yes_ask_dollars);
  const noBid = toNumber(raw.no_bid_dollars);
  const noAsk = toNumber(raw.no_ask_dollars);

  const yesFromBook = yesBid !== null && yesAsk !== null ? (yesBid + yesAsk) / 2 : (yesBid ?? yesAsk);
  const yesProbability = lastPrice !== null && lastPrice > 0 ? lastPrice : (yesFromBook ?? null);

  const noFromBook = noBid !== null && noAsk !== null ? (noBid + noAsk) / 2 : (noBid ?? noAsk);
  const noProbability = noFromBook ?? (yesProbability !== null ? 1 - yesProbability : null);

  const spread = yesBid !== null && yesAsk !== null ? yesAsk - yesBid : null;

  const liquidityDollars = toNumber(raw.liquidity_dollars);
  const openInterest = toNumber(raw.open_interest_fp);
  const hasLiquidity = liquidityDollars !== null && liquidityDollars > 0;

  const priceHistory =
    includeHistory && event?.series_ticker
      ? await fetchCandlesticks(event.series_ticker, raw.ticker)
      : [];

  return {
    platform: "kalshi",
    id: `kalshi-${raw.ticker}`,
    title: raw.title,
    groupTitle: event?.title ?? null,
    sourceUrl: `https://kalshi.com/markets/${raw.ticker}`,
    yesProbability,
    noProbability,
    spread,
    volume: toNumber(raw.volume_fp),
    volume24hr: toNumber(raw.volume_24h_fp),
    liquidity: hasLiquidity ? liquidityDollars : openInterest,
    liquidityLabel: hasLiquidity ? "Liquidity" : "Open Interest",
    closeDate: raw.close_time ?? null,
    status: mapStatus(raw.status),
    resolutionText: raw.rules_primary ?? null,
    priceHistory,
  };
}

function impliedYesProbability(raw: KalshiMarketRaw): number {
  const lastPrice = toNumber(raw.last_price_dollars);
  if (lastPrice !== null && lastPrice > 0) return lastPrice;
  const yesBid = toNumber(raw.yes_bid_dollars);
  const yesAsk = toNumber(raw.yes_ask_dollars);
  if (yesBid !== null && yesAsk !== null) return (yesBid + yesAsk) / 2;
  return yesBid ?? yesAsk ?? 0;
}

/**
 * For multi-market events, the market with the most cumulative volume is often a
 * long-settled longshot, not the current favorite. Surface the highest-probability
 * market as the default, with volume as a tiebreak.
 */
function pickPrimaryMarket(markets: KalshiMarketRaw[]): KalshiMarketRaw {
  return [...markets].sort((a, b) => {
    const probabilityDiff = impliedYesProbability(b) - impliedYesProbability(a);
    if (probabilityDiff !== 0) return probabilityDiff;
    return (toNumber(b.volume_fp) ?? 0) - (toNumber(a.volume_fp) ?? 0);
  })[0];
}

export interface KalshiResolution {
  market: Market;
  alternates: Market[];
}

export async function resolveKalshiUrl(url: string): Promise<KalshiResolution> {
  const candidates = parseKalshiUrl(url);
  if (!candidates || candidates.length === 0) {
    throw new MarketResolutionError("That doesn't look like a Kalshi market link.");
  }

  for (const candidate of candidates) {
    const directMarket = await fetchMarketByTicker(candidate);
    if (directMarket) {
      const eventResult = await fetchEventByTicker(directMarket.event_ticker);
      const siblingRaws = (eventResult?.markets ?? []).filter((m) => m.ticker !== directMarket.ticker);

      const [market, alternates] = await Promise.all([
        normalizeMarket(directMarket, eventResult?.event),
        Promise.all(
          siblingRaws.slice(0, 9).map((raw) => normalizeMarket(raw, eventResult?.event, false)),
        ),
      ]);
      return { market, alternates };
    }

    const eventResult = await fetchEventByTicker(candidate);
    if (eventResult && eventResult.markets.length > 0) {
      const primaryRaw = pickPrimaryMarket(eventResult.markets);
      const alternateRaws = eventResult.markets
        .filter((m) => m.ticker !== primaryRaw.ticker)
        .slice(0, 9);

      const [market, alternates] = await Promise.all([
        normalizeMarket(primaryRaw, eventResult.event),
        Promise.all(alternateRaws.map((raw) => normalizeMarket(raw, eventResult.event, false))),
      ]);
      return { market, alternates };
    }
  }

  throw new MarketResolutionError(`Could not find a Kalshi market for "${candidates[0]}".`);
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Elections: ["president", "election", "senate", "governor", "primary", "congress"],
  Politics: ["president", "election", "senate", "congress", "governor", "vote", "policy"],
  Crypto: ["bitcoin", "ethereum", "crypto", "btc", "eth", "solana", "token"],
  Economics: ["fed", "inflation", "cpi", "gdp", "rate", "recession", "jobs", "unemployment", "interest"],
  Financials: ["stock", "index", "s&p", "nasdaq", "dow", "market cap"],
  Sports: ["championship", "cup", "league", "game", "season", "nfl", "nba", "nhl", "mlb", "soccer", "world cup"],
  Entertainment: ["movie", "oscar", "grammy", "album", "box office", "award", "netflix"],
  "Science and Technology": ["ai", "spacex", "nasa", "launch", "openai", "technology"],
  "Climate and Weather": ["weather", "hurricane", "temperature", "climate", "storm"],
  World: ["war", "country", "nation", "global", "international"],
};

function guessCategories(title: string): string[] {
  const lower = title.toLowerCase();
  const matches = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)))
    .map(([category]) => category);
  return matches.length > 0 ? matches.slice(0, 3) : ["Politics", "Economics", "World"];
}

async function fetchSeriesForCategory(category: string, limit = 200): Promise<KalshiSeriesRaw[]> {
  const url = `${TRADE_API_BASE}/series?category=${encodeURIComponent(category)}&limit=${limit}`;
  const data = await fetchJson<{ series?: KalshiSeriesRaw[] }>(url);
  return data?.series ?? [];
}

async function fetchOpenEventsForSeries(
  seriesTicker: string,
  limit = 20,
): Promise<KalshiEventRaw[]> {
  const url = `${TRADE_API_BASE}/events?series_ticker=${seriesTicker}&status=open&with_nested_markets=true&limit=${limit}`;
  const data = await fetchJson<{ events?: KalshiEventRaw[] }>(url);
  return data?.events ?? [];
}

export async function searchKalshiMarkets(title: string, limit = 8): Promise<Market[]> {
  const categories = guessCategories(title);
  const seriesLists = await Promise.all(categories.map((category) => fetchSeriesForCategory(category)));
  const allSeries = seriesLists.flat();

  const topSeries = allSeries
    .map((series) => ({ series, score: titleSimilarity(title, series.title) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => entry.series);

  const eventLists = await Promise.all(
    topSeries.map((series) => fetchOpenEventsForSeries(series.ticker)),
  );

  const flattened: Array<{ raw: KalshiMarketRaw; event: KalshiEventRaw }> = [];
  for (const events of eventLists) {
    for (const event of events) {
      for (const raw of event.markets ?? []) {
        flattened.push({ raw, event });
      }
    }
  }

  const ranked = flattened
    .map((entry) => ({ ...entry, score: titleSimilarity(title, entry.raw.title) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return Promise.all(ranked.map((entry) => normalizeMarket(entry.raw, entry.event, false)));
}
