---
status: proposed
depends_on: [infra-02-historical-snapshots, infra-03-persisted-matched-pairs]
introduces: [outcomes table, calibration scoring]
---

# Historical accuracy / calibration tracking

## What this is

Once a matched pair resolves, record which platform's pre-close price was closer to the actual
outcome, aggregated over time into a per-platform calibration score — "when Polymarket and Kalshi
disagreed, which one tended to be right more often?"

## Why

This is the pair-level gap comparison ([delta-strip.tsx](../../src/components/delta-strip.tsx))
extended into a track record: not just "who's cheaper right now" but "who's been more accurate
historically," which is a genuinely interesting statement about each platform's price-discovery
quality if the sample size is large enough to mean anything.

## Prerequisites

- [infra-02](./infra-02-historical-snapshots.md) — needs a pre-close price snapshot for each side,
  not just the final one.
- [infra-03](./infra-03-persisted-matched-pairs.md) — calibration is scored per persisted pair.

## Data model

```sql
CREATE TABLE resolved_pair_outcomes (
  matched_pair_id TEXT PRIMARY KEY REFERENCES matched_pairs(id),
  outcome TEXT NOT NULL,                  -- 'yes' | 'no'
  resolved_at TEXT NOT NULL,              -- ISO 8601
  pre_close_yes_a REAL,                   -- platform A's yes_probability shortly before close
  pre_close_yes_b REAL,                   -- platform B's yes_probability shortly before close
  brier_a REAL,                           -- platform A's Brier score for this outcome
  brier_b REAL                            -- platform B's Brier score for this outcome
);
```

Use the **Brier score** (`(forecast_probability - actual_outcome)^2`, where `actual_outcome` is 1
for Yes / 0 for No) rather than a binary "who was closer" flag — it's the standard forecast
calibration metric, handles confidence correctly (a wrong 51% call and a wrong 99% call shouldn't
score the same), and aggregates cleanly (`AVG(brier_a)` per platform across all resolved pairs is
a real "which platform's prices tend to be better calibrated" number).

## Implementation plan

1. **Detecting resolution.** In the crawler's crawl tick (infra-01), when a `markets` row's status
   transitions to `closed`/`settled` (compare against its previous status), and it's the last
   remaining open side of a `matched_pairs` row, look up the actual outcome. Polymarket markets
   expose resolution via the Gamma API's `umaResolutionStatus`/outcome fields; Kalshi via the
   `result` field on `GET /markets/{ticker}`. Both are already partially modeled by
   `MarketStatusSchema` in `lib/types.ts` — extend it if the existing `status` enum doesn't
   capture the actual Yes/No outcome, since today it only tracks lifecycle state, not result.
2. **Pre-close snapshot selection.** Define "pre-close" precisely — e.g. the last
   `market_snapshots` row at least 1 hour before `close_date`, not literally the final tick (which
   can be degenerate, e.g. 99.9%/0.1% once the outcome is essentially public). Make this a named
   constant, not a magic number inline.
3. **Compute and store.** On detecting resolution for both sides, insert one
   `resolved_pair_outcomes` row with both Brier scores computed from their respective pre-close
   snapshots.
4. **Aggregate view.** `GET /calibration/summary` (Worker read API) returning
   `AVG(brier_a)`/`AVG(brier_b)` bucketed however makes sense (overall, by category if categories
   get tracked, over a trailing window) — this is the number that would actually go on an "About"
   or dedicated stats page.

## Open questions

- **Sample size honesty.** A calibration score from a handful of resolved pairs is not
  statistically meaningful — the UI must show a resolved-pair count next to any aggregate score
  and probably suppress the headline number entirely below some minimum sample size, rather than
  presenting an early, noisy number as if it were a real finding.
- **Category skew.** If most tracked pairs end up being, say, politics markets, an overall
  calibration score mostly measures "who's better at politics," not general price-discovery
  quality. Worth deciding whether to break scores out by category once there's enough volume to
  do so meaningfully, rather than only ever publishing a single blended number.
