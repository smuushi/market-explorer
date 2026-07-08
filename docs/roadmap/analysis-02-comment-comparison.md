---
status: proposed
depends_on: [infra-03-persisted-matched-pairs]
introduces: [Polymarket comments panel]
---

# Comment/discussion comparison

## What this is

Surface each platform's on-market discussion side by side next to a matched pair, and (longer
term) a rough sentiment/consensus read of each side's discussion versus its own price.

## Important scope correction vs. the original roadmap bullet

The root README's roadmap bullet assumes **both** platforms expose on-market discussion via API.
That's only true for one side — confirmed while writing this doc:

- **Polymarket** has a public, unauthenticated `GET /comments` endpoint on the Gamma API
  (`gamma-api.polymarket.com/comments`), filterable by `parent_entity_type` (`Event` / `Series` /
  `market`) and `parent_entity_id`, rate-limited at 200 req/10s. This is straightforward to add
  alongside the existing Gamma calls in `src/lib/polymarket.ts`.
- **Kalshi's Trade API v2 has no public comments/discussion endpoint.** Its REST API surface is
  limited to markets, events, series, orderbooks, and trades — nothing discussion-related is
  documented or discoverable. (Kalshi's own website may show discussion UI, but there's no
  supported API for it — don't build against an unofficial/scraped source for this.)

**Implication:** this can't be a true side-by-side comment comparison today. It's a
Polymarket-only discussion panel next to the pair, clearly labeled as such. Revisit if Kalshi ever
ships a public discussion API — don't build a Kalshi comment-fetching path speculatively in the
meantime.

## Why (revised)

Even one-sided, showing what Polymarket traders are actually saying about a market next to its
Kalshi-side price comparison is still useful context that neither platform's own UI puts alongside
a cross-platform price comparison. It's a smaller, honest version of the original idea rather than
a symmetric feature that doesn't exist.

## Prerequisites

[infra-03](./infra-03-persisted-matched-pairs.md) is a soft dependency — this could technically be
added to the on-demand compare view today (fetch comments for whichever side is Polymarket,
alongside the existing `resolveMarketUrl` call), but it's grouped with the persisted-pairs work
because it's most valuable as a permanent feature of a tracked pair's page, not a one-off fetch on
every comparison.

## Implementation plan

1. **New adapter function.** Add `fetchPolymarketComments(marketId: string, limit = 20)` to
   `src/lib/polymarket.ts`, calling `GET /comments?parent_entity_type=market&parent_entity_id=<id>&limit=<limit>&order=createdAt&ascending=false`. Define a Zod schema for the response
   (id, body, createdAt, profile display name) in `src/lib/types.ts`, following the same
   "validate everything external" convention the rest of the adapters use.
2. **API route.** A new `GET /api/comments?marketId=<id>` Route Handler (or fold it into an
   existing route as an optional field) — server-side, same CORS/caching rationale as the
   existing `/api/resolve` and `/api/suggest` routes.
3. **UI.** A collapsible panel in `MarketPanel` (`src/components/market-panel.tsx`) that only
   renders for the Polymarket side of a comparison, clearly labeled ("Polymarket discussion — no
   public API for Kalshi discussion yet") rather than silently showing nothing for Kalshi and
   leaving it ambiguous whether that's a bug or a platform limitation.
4. **Sentiment read (longer term, explicitly out of scope for a first pass).** The original
   roadmap bullet's "rough sentiment/consensus read of discussion versus price" is a meaningfully
   bigger feature (needs an LLM or classifier pass over comment text, plus a defined way to
   compare that against the price). Don't bundle it into the same PR as the basic comments panel —
   ship the panel first, decide separately whether the sentiment layer is worth the added
   complexity and OpenAI cost once real comment volume/quality can be seen.

## Open questions

- **Moderation/embedding third-party user content.** Comments are user-generated content from
  Polymarket, displayed on a different site. Attribute clearly (link back to the comment's source
  on Polymarket), and don't build any comment-posting capability — read-only display only.
- **Given the asymmetry, is this still worth building?** Worth an explicit gut-check before
  investing time: a Polymarket-only panel is a smaller, less novel feature than the "compare
  discussion on both sides" pitch in the original roadmap bullet. Confirm it's still wanted with
  the corrected scope before implementing.
