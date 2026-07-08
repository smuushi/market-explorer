import { MIN_MATCH_SIMILARITY, titleSimilarity } from "@/lib/text";
import type { Market, PricePoint } from "@/lib/types";
import { MarketResolutionError } from "@/lib/types";

const GAMMA_BASE = "https://gamma-api.polymarket.com";
const CLOB_BASE = "https://clob.polymarket.com";
const REVALIDATE_SECONDS = 30;

interface GammaEventRef {
  slug?: string;
  title?: string;
}

interface GammaMarketRaw {
  id: string;
  question: string;
  slug: string;
  outcomes?: string;
  outcomePrices?: string;
  clobTokenIds?: string;
  volume?: string | number;
  volumeNum?: number;
  volume24hr?: number;
  liquidity?: string | number;
  liquidityNum?: number;
  bestBid?: number;
  bestAsk?: number;
  spread?: number;
  endDate?: string;
  active?: boolean;
  closed?: boolean;
  description?: string;
  groupItemTitle?: string | null;
  events?: GammaEventRef[];
}

interface GammaEventRaw {
  id: string;
  title: string;
  slug: string;
  markets?: GammaMarketRaw[];
}

function safeJsonArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toNumber(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null) return null;
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

export interface ParsedPolymarketUrl {
  kind: "event" | "market";
  slug: string;
}

export function parsePolymarketUrl(url: string): ParsedPolymarketUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.hostname.includes("polymarket.com")) return null;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const [kind, slug] = segments;
  if (kind !== "event" && kind !== "market") return null;
  return { kind, slug };
}

async function fetchPriceHistory(clobTokenId: string | undefined): Promise<PricePoint[]> {
  if (!clobTokenId) return [];
  const url = `${CLOB_BASE}/prices-history?market=${clobTokenId}&interval=1w&fidelity=180`;
  const data = await fetchJson<{ history?: Array<{ t: number; p: number }> }>(url);
  if (!data?.history) return [];
  return data.history.map((point) => ({ timestamp: point.t, price: point.p }));
}

async function normalizeMarket(
  raw: GammaMarketRaw,
  eventFallback?: { slug: string; title: string },
  includeHistory = true,
): Promise<Market> {
  const outcomes = safeJsonArray(raw.outcomes);
  const prices = safeJsonArray(raw.outcomePrices).map(Number);
  const tokenIds = safeJsonArray(raw.clobTokenIds);

  const yesIndex = outcomes.findIndex((outcome) => outcome.toLowerCase() === "yes");
  const resolvedYesIndex = yesIndex === -1 ? 0 : yesIndex;
  const resolvedNoIndex = resolvedYesIndex === 0 ? 1 : 0;

  const yesProbability = prices[resolvedYesIndex] ?? null;
  const noProbability =
    prices[resolvedNoIndex] ?? (yesProbability !== null ? 1 - yesProbability : null);

  const bestBid = toNumber(raw.bestBid);
  const bestAsk = toNumber(raw.bestAsk);
  const spread = toNumber(raw.spread) ?? (bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null);

  const parentEvent = raw.events?.[0] ?? eventFallback;
  const sourceUrl = parentEvent
    ? `https://polymarket.com/event/${parentEvent.slug}`
    : `https://polymarket.com/event/${raw.slug}`;

  const priceHistory = includeHistory ? await fetchPriceHistory(tokenIds[resolvedYesIndex]) : [];

  return {
    platform: "polymarket",
    id: `polymarket-${raw.id}`,
    title: raw.question,
    groupTitle: parentEvent?.title ?? null,
    optionLabel: raw.groupItemTitle || null,
    sourceUrl,
    yesProbability,
    noProbability,
    spread,
    volume: toNumber(raw.volumeNum) ?? toNumber(raw.volume),
    volume24hr: toNumber(raw.volume24hr),
    liquidity: toNumber(raw.liquidityNum) ?? toNumber(raw.liquidity),
    liquidityLabel: "Liquidity",
    closeDate: raw.endDate ?? null,
    status: raw.closed ? "closed" : raw.active ? "open" : "unknown",
    resolutionText: raw.description ?? null,
    priceHistory,
  };
}

function impliedYesProbability(raw: GammaMarketRaw): number {
  const outcomes = safeJsonArray(raw.outcomes);
  const prices = safeJsonArray(raw.outcomePrices).map(Number);
  const yesIndex = outcomes.findIndex((outcome) => outcome.toLowerCase() === "yes");
  return prices[yesIndex === -1 ? 0 : yesIndex] ?? 0;
}

/**
 * For multi-outcome events (e.g. "who will win the World Cup"), the outcome with the
 * most cumulative volume is often a long-settled longshot, not the current favorite.
 * Surface the highest-probability outcome as the default, with volume as a tiebreak.
 */
function pickPrimaryMarket(markets: GammaMarketRaw[]): GammaMarketRaw {
  return [...markets].sort((a, b) => {
    const probabilityDiff = impliedYesProbability(b) - impliedYesProbability(a);
    if (probabilityDiff !== 0) return probabilityDiff;
    return (toNumber(b.volumeNum) ?? 0) - (toNumber(a.volumeNum) ?? 0);
  })[0];
}

export interface PolymarketResolution {
  market: Market;
  alternates: Market[];
}

export async function resolvePolymarketUrl(url: string): Promise<PolymarketResolution> {
  const parsed = parsePolymarketUrl(url);
  if (!parsed) {
    throw new MarketResolutionError("That doesn't look like a Polymarket market or event link.");
  }

  if (parsed.kind === "market") {
    const raw = await fetchJson<GammaMarketRaw>(`${GAMMA_BASE}/markets/slug/${parsed.slug}`);
    if (!raw) {
      throw new MarketResolutionError(`Could not find a Polymarket market at "${parsed.slug}".`);
    }
    const market = await normalizeMarket(raw);
    return { market, alternates: [] };
  }

  const event = await fetchJson<GammaEventRaw>(`${GAMMA_BASE}/events/slug/${parsed.slug}`);
  if (!event || !event.markets?.length) {
    throw new MarketResolutionError(`Could not find a Polymarket event at "${parsed.slug}".`);
  }

  const eventFallback = { slug: event.slug, title: event.title };
  const primaryRaw = pickPrimaryMarket(event.markets);
  const alternateRaws = event.markets.filter((market) => market.id !== primaryRaw.id).slice(0, 9);

  const [market, alternates] = await Promise.all([
    normalizeMarket(primaryRaw, eventFallback),
    Promise.all(alternateRaws.map((raw) => normalizeMarket(raw, eventFallback, false))),
  ]);

  return { market, alternates };
}

export async function searchPolymarketMarkets(query: string, limit = 8): Promise<Market[]> {
  const url = `${GAMMA_BASE}/public-search?q=${encodeURIComponent(query)}&limit_per_type=${limit}`;
  const data = await fetchJson<{ events?: GammaEventRaw[] }>(url);
  if (!data?.events) return [];

  const flattened: Array<{ raw: GammaMarketRaw; eventFallback: { slug: string; title: string } }> = [];
  for (const event of data.events) {
    const eventFallback = { slug: event.slug, title: event.title };
    for (const raw of event.markets ?? []) {
      flattened.push({ raw, eventFallback });
    }
  }

  const ranked = flattened
    .map((entry) => ({ ...entry, score: titleSimilarity(query, entry.raw.question) }))
    .filter((entry) => entry.score >= MIN_MATCH_SIMILARITY)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return Promise.all(ranked.map((entry) => normalizeMarket(entry.raw, entry.eventFallback, false)));
}
