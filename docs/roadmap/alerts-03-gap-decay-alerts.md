---
status: proposed
depends_on: [infra-02-historical-snapshots, infra-03-persisted-matched-pairs, alerts-01-threshold-notifications]
introduces: [gap-decay detection in the crawl loop]
---

# Gap-decay alerts

## What this is

Flag when a large probability gap between two matched markets closes quickly — the two platforms
converging fast is itself a signal that one side's price discovery lagged the other's and just
caught up, which is a more interesting event than the raw gap alone.

## Why

A static "gap > 5%" alert ([alerts-01](./alerts-01-threshold-notifications.md)) tells you a
disagreement exists; it doesn't tell you a disagreement just *resolved itself*, which is the more
diagnostic moment — it's evidence one platform "won" the price-discovery race for that update, tying
directly into [analysis-01](./analysis-01-first-mover.md)'s lead-time framing but expressed as a
real-time alert instead of a retrospective comparison.

## Prerequisites

- [infra-02](./infra-02-historical-snapshots.md) — decay detection needs multiple historical gap
  readings over a short window, not just the current one.
- [infra-03](./infra-03-persisted-matched-pairs.md) — operates over persisted pairs.
- [alerts-01](./alerts-01-threshold-notifications.md) — reuses its subscription/dispatch
  machinery; this is a second *fire condition* on the same infrastructure, not a separate
  notification system.

## Implementation plan

1. **Definition.** A gap-decay event on a pair is: the gap between the two `market_snapshots`
   readings closes by at least `X` percentage points within a window of `Y` minutes, where the
   gap was above some minimum size before decaying (a gap shrinking from 1% to 0% isn't
   interesting; one shrinking from 20% to 3% is). Suggested starting values: `X = 10` points,
   `Y = 60` minutes — treat these as tunable constants in one place (e.g.
   `worker/src/gap-decay.ts`), not hardcoded inline, since they'll need calibrating against real
   data the same way `MIN_MATCH_SIMILARITY`/`HIGH_CONFIDENCE_SIMILARITY` in `lib/text.ts` were.
2. **Detection.** In the crawl tick, after inserting a new `market_snapshots` row for both sides of
   a pair, query the last `Y` minutes of snapshots for that pair, compute the gap at the window's
   start vs. now, and check against the decay threshold:

   ```sql
   SELECT captured_at, yes_probability
   FROM market_snapshots
   WHERE platform = ? AND market_id = ? AND captured_at >= ?
   ORDER BY captured_at ASC
   LIMIT 1;
   ```
   (run once per side of the pair, then diff the two gaps — at window-start vs. now.)
3. **Extend, don't duplicate, alert dispatch.** Reuse `alert_subscriptions` and the dispatch logic
   from [alerts-01](./alerts-01-threshold-notifications.md) — a gap-decay event is just a second
   fire condition alongside "gap exceeds threshold," not a new notification pipeline. Consider a
   `subscription_type` column (`'threshold' | 'decay'`) if the two need different config
   (threshold-percent vs. decay-rate-percent).

## Open questions

- **False positives from noisy/thin markets.** Low-liquidity markets can show large probability
  swings on tiny trades that aren't real "price discovery," they're noise. Consider requiring a
  minimum volume/liquidity floor (same idea as the leaderboard's filter in
  [alerts-02](./alerts-02-spread-leaderboard.md)) before a pair is eligible for decay detection at
  all.
- **This is the most speculative item in the roadmap.** Unlike the other Alerts items, there's no
  existing UI or calculation to extend (delta-strip.tsx shows a static gap, not a rate of change) —
  treat the constants above as a first guess to validate against real crawled data before building
  the alert-firing logic around them, not as settled values.
