# Roadmap design docs

These are implementation/architecture specs for the items listed under "Roadmap / out of scope
for this MVP" in the root [`README.md`](../../README.md). None of this is built yet — the current
app is deliberately on-demand only (paste a link, fetch live, no database). These docs exist so
that if/when one of these items gets picked up (by a human or an AI agent), there's a concrete
starting plan instead of a one-line bullet.

**If you're an agent asked to implement one of these:** read the doc fully before writing code,
check its "Prerequisites" section against what's actually merged (docs describe a possible future
state, not the current one), and re-read `AGENTS.md` at the repo root first — this is still a
small portfolio project, so prefer the smallest version of a feature that's genuinely useful over
the most complete one described here.

## Foundation

Every item below except the on-demand app itself assumes markets get crawled and stored
periodically instead of only being fetched at request time. That foundation is
[`infra-01-always-on-crawler.md`](./infra-01-always-on-crawler.md) — **read it first**, even if
you're implementing something from Alerts or Analysis, since it defines the shared database schema
(`markets`, `market_snapshots`, `matched_pairs`) that everything else reads from or writes to.

## Items

| # | Doc | Depends on |
|---|-----|------------|
| Infrastructure 1 | [Always-on crawler (Cloudflare Worker + D1)](./infra-01-always-on-crawler.md) | — |
| Infrastructure 2 | [Historical snapshots & trend charts](./infra-02-historical-snapshots.md) | Infra 1 |
| Infrastructure 3 | [Persisted matched pairs](./infra-03-persisted-matched-pairs.md) | Infra 1 |
| Alerts 1 | [Threshold notifications (email/Discord/webhook)](./alerts-01-threshold-notifications.md) | Infra 1, Infra 3 |
| Alerts 2 | [Live spread leaderboard](./alerts-02-spread-leaderboard.md) | Infra 1, Infra 3 |
| Alerts 3 | [Gap-decay alerts](./alerts-03-gap-decay-alerts.md) | Infra 2, Infra 3, Alerts 1 |
| Analysis 1 | [Which market "won" (first-mover lead time)](./analysis-01-first-mover.md) | Infra 2, Infra 3 |
| Analysis 2 | [Comment/discussion comparison](./analysis-02-comment-comparison.md) | Infra 3 |
| Analysis 3 | [Historical accuracy / calibration tracking](./analysis-03-calibration-tracking.md) | Infra 2, Infra 3 |

## Conventions used in these docs

- Each doc has a frontmatter block (`status`, `depends_on`, `introduces`) for quick machine
  parsing — `status` is always `proposed` until something actually ships, at which point the doc
  should be updated or replaced by real code comments/README sections.
- SQL schemas are proposals, not migrations — there's no migration tooling set up yet (see Infra 1
  for the recommended one).
- "Open questions" sections call out real forks in the design that whoever implements this should
  decide on purpose, not by default. Don't silently pick one without noting it in the PR.
