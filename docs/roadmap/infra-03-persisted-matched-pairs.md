---
status: proposed
depends_on: [infra-01-always-on-crawler]
introduces: [matched_pairs table]
---

# Persisted matched pairs

## What this is

A stored table of confirmed cross-platform market matches, so the heuristic + AI matching cost
(`lib/match.ts`, `lib/ai-match.ts`) is paid once per pair instead of once per page load.

## Why

Today, every comparison — even for the same two markets someone compared five minutes ago —
re-runs `findMatchesForMarket()`: a Kalshi/Polymarket search call plus, in the common ambiguous
case, an OpenAI call. That's the right tradeoff for an on-demand tool with no state, but it means
[alerts](./alerts-01-threshold-notifications.md), a [leaderboard](./alerts-02-spread-leaderboard.md),
or any kind of "track this pair over time" feature has nothing to attach to — there's no durable
identity for "Polymarket market X ⇄ Kalshi market Y" that persists between requests.

## Prerequisites

[infra-01](./infra-01-always-on-crawler.md) — pairs are between rows in the `markets` table, and
matching candidates against a live-crawled set (rather than a live API call) is what makes this
worth persisting in the first place.

## Data model

```sql
CREATE TABLE matched_pairs (
  id TEXT PRIMARY KEY,                 -- `${platform_a}:${market_id_a}__${platform_b}:${market_id_b}`
  platform_a TEXT NOT NULL,
  market_id_a TEXT NOT NULL,
  platform_b TEXT NOT NULL,
  market_id_b TEXT NOT NULL,
  match_score REAL,                    -- heuristic Jaccard score at match time, or null if AI-only
  match_method TEXT NOT NULL,          -- 'heuristic' | 'ai' | 'manual'
  confirmed_at TEXT NOT NULL,          -- ISO 8601
  last_verified_at TEXT NOT NULL,      -- ISO 8601, last crawl tick that re-checked this pair is still valid
  FOREIGN KEY (platform_a, market_id_a) REFERENCES markets(platform, market_id),
  FOREIGN KEY (platform_b, market_id_b) REFERENCES markets(platform, market_id)
);

CREATE UNIQUE INDEX idx_matched_pairs_lookup
  ON matched_pairs(platform_a, market_id_a, platform_b, market_id_b);
```

Canonicalize `platform_a`/`platform_b` ordering (e.g. always `polymarket` as `_a`, `kalshi` as
`_b`, since those are the only two platforms today) so the same pair can't be inserted twice in
opposite order.

## Implementation plan

1. **Where matches get created.** Two entry points, both worth wiring:
   - The existing on-demand flow: when a user's `/api/suggest` call (via `findMatchesForMarket` in
     `lib/match.ts`) picks a confident match, upsert it into `matched_pairs` instead of discarding
     the result after the response is sent. This means the pair table grows organically from real
     usage first, before the crawler does any matching of its own.
   - The crawler (infra-01): periodically run `findMatchesForMarket` over newly-crawled markets
     that aren't already in `matched_pairs`, so the pair set also grows independent of site
     traffic. This is the more expensive path (OpenAI calls at crawl scale, not request scale) —
     rate-limit it deliberately (e.g. N new markets matched per crawl tick, not the whole backlog
     at once).
2. **Re-verification.** Markets close/resolve; a pair matched weeks ago should periodically be
   re-checked that both sides are still open (or intentionally kept once resolved, if
   [analysis-03](./analysis-03-calibration-tracking.md) wants to score resolved pairs). Update
   `last_verified_at` on each check rather than re-running the full match logic every time — only
   re-match if one side's `status` changed since the pair was confirmed.
3. **Read API.** `GET /pairs?limit=50` for a browsable list, `GET /pairs/:id` for a single pair's
   current `markets` rows joined in — this becomes the backing data for
   [alerts-02](./alerts-02-spread-leaderboard.md)'s leaderboard directly.

## Open questions

- **Manual overrides.** The UI already lets a user pick a different candidate than the
  auto-suggested one (`MarketOptionPicker`). If persisted pairs are meant to reflect "what users
  actually confirmed," consider only writing to `matched_pairs` when a user explicitly lands on a
  final pair (e.g. after clicking Compare), not on every suggestion returned — otherwise the table
  fills with candidates nobody actually confirmed.
- **Pair invalidation.** If the heuristic/AI logic in `lib/match.ts` changes later (as it already
  has once this project — see the false-positive fixes in git history), old persisted pairs don't
  automatically get re-evaluated against the new logic. Decide whether a `match_method`/logic
  version needs to be stored alongside each pair so a future matching-logic change can identify
  and re-check pairs matched under the old rules.
