---
status: proposed
depends_on: [infra-01-always-on-crawler, infra-03-persisted-matched-pairs]
introduces: [/leaderboard page, GET /pairs/leaderboard API]
---

# Live spread leaderboard

## What this is

A page listing every currently-tracked matched pair, ranked by current probability gap (biggest
cross-platform disagreement first) — a browsable "what's most mispriced right now" view, instead
of only surfacing a gap when someone happens to paste that specific pair.

## Why

This is the most direct way to make persisted matches ([infra-03](./infra-03-persisted-matched-pairs.md))
visibly useful on the site itself, not just as plumbing for alerts. It's also the most
naturally shareable/interesting page for the site's original outreach goal (a leaderboard is a
much better "look what this does" screenshot than an empty paste box).

## Prerequisites

- [infra-01](./infra-01-always-on-crawler.md) — needs current prices for both sides of every pair.
- [infra-03](./infra-03-persisted-matched-pairs.md) — needs a `matched_pairs` table to rank.

## Implementation plan

1. **Read API.** `GET /pairs/leaderboard?limit=50` on the Worker (infra-01's read API), joining
   `matched_pairs` to `markets` on both sides and computing the gap server-side:

   ```sql
   SELECT
     mp.id,
     ma.platform AS platform_a, ma.title AS title_a, ma.yes_probability AS yes_a,
     mb.platform AS platform_b, mb.title AS title_b, mb.yes_probability AS yes_b,
     ABS(ma.yes_probability - mb.yes_probability) AS gap
   FROM matched_pairs mp
   JOIN markets ma ON ma.platform = mp.platform_a AND ma.market_id = mp.market_id_a
   JOIN markets mb ON mb.platform = mp.platform_b AND mb.market_id = mp.market_id_b
   WHERE ma.status = 'open' AND mb.status = 'open'
   ORDER BY gap DESC
   LIMIT ?;
   ```

2. **Frontend.** A new `/leaderboard` route in the Next.js app, server-rendered (this is public,
   read-only data — no reason to make it client-only), reusing `PlatformBadge` and a condensed
   variant of `MarketPanel`'s odds display for each row. Each row should link into the existing
   compare view pre-filled with both `sourceUrl`s (the [share feature](../../README.md) already
   supports `?left=&right=` query params — reuse that exact mechanism to link a leaderboard row
   straight into a full comparison).
3. **Filtering.** At minimum a status filter (open pairs only, matching the query above) and
   probably a minimum-volume filter — a 40% gap between two markets with $50 of volume each isn't
   an interesting disagreement, it's noise. Consider a `WHERE ma.volume > ? AND mb.volume > ?`
   clause with a sensible default floor.
4. **Caching.** This is exactly the kind of page that benefits from a short cache window (the
   underlying data only changes once per crawl tick, e.g. every 15 min) — use Next.js's
   `revalidate` on the route rather than hitting the Worker on every page view.

## Open questions

- **Pagination vs. a fixed top-N.** A true leaderboard (top 20-50) is simpler to build and is
  probably the more useful product anyway — full pagination through every tracked pair adds
  complexity for a view whose whole point is "show me the most interesting ones first."
- **Resolved pairs.** Decide whether closed/settled pairs drop off the leaderboard immediately
  (simplest) or get a separate "recently resolved" section — the latter overlaps with
  [analysis-03](./analysis-03-calibration-tracking.md)'s calibration tracking and might be better
  built there instead of duplicating a "past pairs" view in two places.
