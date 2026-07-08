import { judgeBestMatch } from "@/lib/ai-match";
import { searchKalshiMarkets } from "@/lib/kalshi";
import { searchPolymarketMarkets } from "@/lib/polymarket";
import { extractKeywords, HIGH_CONFIDENCE_SIMILARITY } from "@/lib/text";
import type { Market } from "@/lib/types";

const DEFAULT_SUGGESTION_LIMIT = 5;
/** Candidate pool size to hand the AI judge — wide enough to include the real match, small
 * enough to keep the prompt (and cost) tiny. */
const AI_CANDIDATE_POOL = 8;

/**
 * Given a resolved market on one platform, find the best candidate matches on the other
 * platform, ranked best-first.
 *
 * Matching is a two-stage hybrid:
 * 1. A fast, free heuristic (category inference + Jaccard title-token overlap) narrows the
 *    universe of live markets down to a small ranked shortlist.
 * 2. If the heuristic's top score is high enough to trust outright, use it as-is. Otherwise
 *    (the common case — see HIGH_CONFIDENCE_SIMILARITY) the score is too ambiguous to trust
 *    blindly, so a small LLM reads the shortlist and judges which candidate (if any) is
 *    really asking the same question, falling back to the heuristic order if the model is
 *    unavailable or fails.
 */
export async function findMatchesForMarket(
  market: Market,
  limit = DEFAULT_SUGGESTION_LIMIT,
): Promise<Market[]> {
  const scored =
    market.platform === "polymarket"
      ? await searchKalshiMarkets(market.title, AI_CANDIDATE_POOL)
      : await searchPolymarketMarkets(
          extractKeywords(market.title).join(" ") || market.title,
          AI_CANDIDATE_POOL,
        );

  if (scored.length === 0) return [];
  if (scored[0].score >= HIGH_CONFIDENCE_SIMILARITY) {
    return scored.slice(0, limit).map((entry) => entry.market);
  }

  const judgment = await judgeBestMatch(
    market,
    scored.map((entry) => entry.market),
  );
  if (!judgment) {
    return scored.slice(0, limit).map((entry) => entry.market);
  }
  if (judgment.index === null) {
    return [];
  }

  const picked = scored[judgment.index]?.market;
  if (!picked) {
    return scored.slice(0, limit).map((entry) => entry.market);
  }

  const rest = scored.filter((_, index) => index !== judgment.index).map((entry) => entry.market);
  return [picked, ...rest].slice(0, limit);
}
