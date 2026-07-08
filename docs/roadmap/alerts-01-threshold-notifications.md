---
status: proposed
depends_on: [infra-01-always-on-crawler, infra-03-persisted-matched-pairs]
introduces: [alert_subscriptions table, notification dispatch]
---

# Threshold notifications (email / Discord / webhook)

## What this is

Let someone subscribe to a specific matched pair and get notified when the probability gap between
the two platforms crosses a threshold they set — "tell me when Polymarket and Kalshi disagree by
more than 5% on this question" — instead of having to keep reopening the comparison to check.

## Why

This is the single most direct expression of the product's core value ("where's the better
odds?") turned into a push instead of a pull: the interesting moment is when a gap crosses a
threshold, not every time someone happens to look.

## Prerequisites

- [infra-01](./infra-01-always-on-crawler.md) — needs a running crawl loop to periodically
  re-check subscribed pairs' current prices; there's nothing to trigger a check against without
  it.
- [infra-03](./infra-03-persisted-matched-pairs.md) — a subscription attaches to a `matched_pairs`
  row, not a one-off request.

## Data model

```sql
CREATE TABLE alert_subscriptions (
  id TEXT PRIMARY KEY,
  matched_pair_id TEXT NOT NULL REFERENCES matched_pairs(id),
  threshold_pct REAL NOT NULL,          -- e.g. 5.0 means "notify when the gap exceeds 5 points"
  channel TEXT NOT NULL,                -- 'email' | 'discord' | 'webhook'
  destination TEXT NOT NULL,            -- email address, Discord webhook URL, or generic webhook URL
  created_at TEXT NOT NULL,
  last_notified_at TEXT,                -- null until the first notification fires
  last_gap_pct REAL                     -- gap at the time of the last check, for gap-decay (alerts-03)
);

CREATE INDEX idx_alert_subscriptions_pair ON alert_subscriptions(matched_pair_id);
```

## Implementation plan

1. **Subscribe flow.** After a comparison resolves in the existing UI (`compare-view.tsx` /
   `delta-strip.tsx`), add a "Notify me" action that creates (or reuses, via
   [infra-03](./infra-03-persisted-matched-pairs.md)) a `matched_pairs` row, then inserts an
   `alert_subscriptions` row with a user-chosen threshold and destination. No login system exists
   in this project — for email, a magic-link-free flow (e.g. "we'll only ever send to this pair's
   threshold-crossing alert, unsubscribe link in every email") avoids needing auth; for
   Discord/webhook, the destination URL itself is the credential, same pattern Discord's own
   incoming webhooks use.
2. **Check loop.** Extend the crawler's cron tick (infra-01): after upserting `markets`, for every
   `alert_subscriptions` row, compute the current gap from the two referenced markets' latest
   `yes_probability` (same math as `delta-strip.tsx`'s probability-gap calculation — extract that
   into a shared pure function, e.g. `lib/gap.ts`, so the Worker and the web app compute it
   identically rather than reimplementing it).
3. **Fire condition.** Notify when `abs(gap_pct) >= threshold_pct` **and** either
   `last_notified_at` is null or the gap has meaningfully changed since the last notification
   (avoid re-notifying every 15 minutes for a gap that's been sitting above threshold for days —
   e.g. only re-notify if the gap widened further, or after a cooldown period).
4. **Dispatch.**
   - Discord/generic webhook: a plain `fetch(destination, { method: "POST", body: ... })` from the
     Worker — no extra dependency needed.
   - Email: needs a transactional email provider (e.g. Resend, Postmark) and an API key stored as
     a Worker secret — this is the one channel that adds an external dependency, so implement
     Discord/webhook first if trying to ship something end-to-end with the least new
     infrastructure.
5. **Unsubscribe.** Every notification must include a working unsubscribe path (a signed link or
   token tied to the `alert_subscriptions.id`) — required for email deliverability and just good
   practice regardless of channel.

## Open questions

- **Abuse/spam potential.** An open "paste an email, get notified" form is a spam vector (someone
  subscribing a stranger's email). At minimum, require confirming the email via a click-through
  link before the first real alert fires; Discord/webhook destinations are self-selecting (you'd
  only give it a URL you control) and don't need this.
- **Rate limits on notification volume.** If many pairs cross threshold in the same crawl tick
  (e.g. a fast-moving news event), decide whether to batch/throttle outbound notifications rather
  than firing them all synchronously inside the cron handler.
