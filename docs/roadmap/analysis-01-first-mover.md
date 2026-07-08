---
status: proposed
depends_on: [infra-02-historical-snapshots, infra-03-persisted-matched-pairs]
introduces: [lead-time computation, "which market moved first" UI]
---

# Which market "won" (first-mover lead time)

## What this is

For matched pairs tied to a real-world event with a hard resolution moment (a Fed decision, an
election call, a game result), compare timestamped price history on each side to measure which
platform's price moved to reflect new information first, and by how much lead time.

## Why

The site's whole premise is "same question, two markets" — this extends that from a static
snapshot comparison into a temporal one: not just "who has the better price right now" but "who
found out first," which is a genuinely novel angle neither platform's own UI shows (each only
knows about itself).

## Prerequisites

- [infra-02](./infra-02-historical-snapshots.md) — needs `market_snapshots` history around the
  actual event moment, not just the ~7-day rolling window either live API exposes.
- [infra-03](./infra-03-persisted-matched-pairs.md) — this only makes sense for pairs that were
  already tracked before the event happened; there's no way to backfill lead-time analysis for a
  pair discovered after the fact (its history wasn't being captured yet).

## Implementation plan

1. **Event anchor.** This analysis needs a "moment" to measure lead time relative to — for markets
   with a hard external trigger (a scheduled Fed announcement, an election call), that anchor has
   to be supplied, not inferred from price data alone (the price *move* is the signal, but knowing
   *what* triggered it requires external knowledge the crawler doesn't have). Start with a manually
   curated list of anchor timestamps for specific high-interest pairs rather than trying to build
   general event-detection — this is squarely a "prove the concept on a handful of real examples"
   feature, not a general-purpose system, at least at first.
2. **Lead-time metric.** Given an anchor timestamp `T`, for each side of the pair: find the first
   `market_snapshots` row after `T` where `yes_probability` has moved by more than some noise
   threshold (e.g. 5 points) from its pre-`T` baseline. The side with the earlier such timestamp
   "moved first"; the difference between the two timestamps is the lead time.

   ```sql
   SELECT captured_at, yes_probability
   FROM market_snapshots
   WHERE platform = ? AND market_id = ? AND captured_at >= ?
   ORDER BY captured_at ASC;
   ```
   (fetch post-anchor snapshots for each side, then walk forward in application code to find the
   first point past the noise threshold — this is naturally a small pure function, e.g.
   `lib/lead-time.ts`, testable independent of the database.)
3. **Presentation.** A dedicated view for a specific pair (linked from the compare view once a
   pair has a recorded anchor event) showing both price lines on a shared timeline with the anchor
   marked, and the computed lead time called out directly (e.g. "Kalshi reflected this 4 minutes
   before Polymarket").

## Open questions

- **Is this worth generalizing at all?** Given how manual the anchor-timestamp step is, this may
  be more valuable as a one-off analysis/blog-post artifact (a handful of hand-picked, compelling
  examples) than a live feature every pair gets. Worth deciding explicitly before investing in a
  general UI for it — the "why I built this" pitch (a portfolio piece for a specific job
  application) might be better served by 2-3 excellent worked examples than a half-built general
  feature.
- **Noise threshold calibration.** The 5-point noise threshold above is a starting guess, not a
  measured constant (unlike `MIN_MATCH_SIMILARITY` in `lib/text.ts`, which was calibrated against
  real false-positive/true-positive examples) — validate it against real snapshot data for a known
  event before trusting the lead-time numbers it produces.
