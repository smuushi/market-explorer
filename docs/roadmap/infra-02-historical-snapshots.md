---
status: proposed
depends_on: [infra-01-always-on-crawler]
introduces: [market_snapshots table]
---

# Historical snapshots & trend charts

## What this is

An append-only time series of price/volume/liquidity per market, captured on every crawl tick, so
the app can show longer-range trend charts than the ~7-day window each platform's own API exposes
today (`Market.priceHistory` in `src/lib/types.ts`, populated from Polymarket's CLOB price-history
endpoint / Kalshi's candlesticks endpoint).

## Why

`Sparkline` (`src/components/sparkline.tsx`) currently renders whatever short window the source
API hands back. That's fine for "what's the recent trend" but can't answer "how has this market
moved since it opened" for anything that's been live more than a week, and it's the raw data
[analysis-01](./analysis-01-first-mover.md) and [analysis-03](./analysis-03-calibration-tracking.md)
need (timestamped price history to measure lead time and pre-close accuracy).

## Prerequisites

[infra-01](./infra-01-always-on-crawler.md) — this table is populated by the same crawl tick that
upserts `markets`, and only exists once that Worker is running.

## Data model

```sql
CREATE TABLE market_snapshots (
  platform TEXT NOT NULL,
  market_id TEXT NOT NULL,
  captured_at TEXT NOT NULL,           -- ISO 8601, crawl tick timestamp
  yes_probability REAL,
  volume REAL,
  liquidity REAL,
  PRIMARY KEY (platform, market_id, captured_at),
  FOREIGN KEY (platform, market_id) REFERENCES markets(platform, market_id)
);

CREATE INDEX idx_snapshots_market ON market_snapshots(platform, market_id, captured_at);
```

One row per market per crawl tick. At a 15-minute cron interval this is ~96 rows/market/day —
trivial for D1 at the scale a portfolio project's crawler would run (a few hundred markets, not
the full universe of either platform).

## Implementation plan

1. In the Worker's crawl tick (see infra-01 step 3), after upserting `markets`, insert one
   `market_snapshots` row per market crawled. This is an insert-only table — never update existing
   rows, so history is never overwritten.
2. **Retention.** Decide a retention window up front (e.g. 1 year) and add a cleanup step to the
   same cron tick (`DELETE FROM market_snapshots WHERE captured_at < ?`) rather than letting the
   table grow unbounded — D1 has practical size limits on the free tier.
3. **Read API.** Extend the Worker's read API (infra-01) with
   `GET /markets/:platform/:id/history?since=<ISO date>`, returning `PricePoint[]`
   (`{ timestamp, price }`, matching the existing `PricePointSchema` in `lib/types.ts` — reuse it
   rather than inventing a new shape) so `Sparkline` can render it unchanged on the frontend.
4. **Frontend.** `MarketPanel` / `Sparkline` would need a way to request the longer history instead
   of (or in addition to) the live API's short window — e.g. a toggle or simply preferring the
   Worker's history when a market has been crawled, falling back to the live API's window for
   markets that haven't (freshly pasted links that aren't in `markets` yet).

## Open questions

- **Backfill.** There's no history before the crawler starts running — a freshly-launched crawler
  has an empty `market_snapshots` table for every market. Decide whether to seed it from each
  platform's own history endpoint on first sight of a market (one extra fetch per new market, not
  per tick) so day-one trend charts aren't empty.
- **Granularity over time.** A flat 15-minute cadence forever is simple but means very old markets
  accumulate a lot of near-duplicate rows once volatility settles down. Not worth solving before
  there's real data showing it's a problem — call this out as a known simplification rather than
  building a downsampling scheme speculatively.
