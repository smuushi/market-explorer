<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PolyComparison AGENTS.md

A small, single-purpose portfolio project: an "Etherscan for prediction markets." Paste a
Polymarket or Kalshi market link, get an instant side-by-side comparison (odds, volume,
liquidity, better-odds verdict) with the equivalent market on the other platform. Live at
[polycomparison.app](https://polycomparison.app). Built to send with a Polymarket job
application — keep it simple, fast, and obviously well-crafted rather than feature-heavy.

## Project scope and philosophy

- This is a portfolio piece, not a product with a roadmap of committed features. Prefer small,
  polished, easy-to-explain changes over ambitious ones. See "Roadmap" in `README.md` for ideas
  that are explicitly **out of scope** for now — don't build those unprompted.
- If you *are* asked to implement a roadmap item, read its design doc in
  [`docs/roadmap/`](./docs/roadmap/) first (start from `docs/roadmap/README.md` for the dependency
  map) — each one covers the proposed data model, architecture, and open decisions in more depth
  than the one-line README bullet.
- No database, no auth, no user accounts. Everything is fetched live, on-demand, from public
  Polymarket and Kalshi APIs. Keep it that way unless the user explicitly asks to change the
  architecture.
- There is a CLI sibling repo, [`parity-cli`](https://github.com/smuushi/parity-cli), that ports
  the same `lib/` adapters (Polymarket/Kalshi normalization, matching) into a standalone
  scriptable tool. The two repos are **not** shared via a package — logic is manually kept in
  sync. If you fix a bug or change behavior in `src/lib/polymarket.ts`, `src/lib/kalshi.ts`,
  `src/lib/text.ts`, or `src/lib/match.ts`, consider whether the same fix applies to
  `parity-cli`'s copies and mention it to the user rather than silently skipping it.

## Tech stack (this repo only — do not assume other projects match)

- **Next.js 16** App Router, **TypeScript**, **Tailwind CSS v4**. This project uses Tailwind with
  small hand-rolled shadcn-style primitives in `src/components/ui/*` — **not** ChakraUI. Don't
  import or suggest ChakraUI here even if other repos in your context use it.
- **Zod** for validating every external API response and internal API request/response shape
  (`src/lib/types.ts`).
- **Recharts** for the price-history sparkline.
- **OpenAI SDK** (`gpt-5.4-mini`) for the AI re-ranker in ambiguous cross-platform matches
  (`src/lib/ai-match.ts`) — optional, gated on `OPENAI_API_KEY` being set, with a heuristic
  fallback if it's missing or the call fails. See "Matching, honestly" in `README.md` for the
  full two-stage design.
- No test suite exists yet. Don't assume tests need to pass — there's nothing to run.

## Commands

```bash
npm run dev              # dev server (Turbopack)
npm run build             # production build — run this before pushing to catch build-time errors
npm run lint               # eslint (eslint-config-next + react-hooks rules)
npx tsc --noEmit           # typecheck (no dedicated npm script exists yet)
```

There is no formatter script (no Prettier, no oxfmt) — this project relies on ESLint + editor
formatting only. Don't add Prettier.

## Deployment

- GitHub: [`smuushi/market-explorer`](https://github.com/smuushi/market-explorer), `main` branch.
- Vercel project `market-explorer` under the `michael-chainpatrols-projects` team. **Pushing to
  `main` auto-deploys to production** via Vercel's GitHub integration — there is no staging
  environment and no PR-based workflow for this repo. Always run `npm run build` and
  `npx tsc --noEmit` locally before pushing, since a broken push goes straight to the live site.
- Custom domain `polycomparison.app` is attached to the `market-explorer` Vercel project (plus the
  default `*.vercel.app` deployment URLs). `metadataBase` in `src/app/layout.tsx` is hardcoded to
  `https://polycomparison.app` — update it if the domain ever changes.
- `OPENAI_API_KEY` is set in Vercel's Production + Preview env vars and in local `.env.local`.

## Learned workspace facts

- `useSearchParams()` in a client component must be used inside a component wrapped in
  `<Suspense>` (see `src/app/page.tsx`), or the build emits a de-opt warning for that route.
- The ESLint rule `react-hooks/set-state-in-effect` traces into any function called from a
  `useEffect` body — including `async` functions defined with `useCallback` — and flags it if that
  function calls `setState` synchronously before its first `await`. Calling such a function
  directly from an effect (even via `void someAsyncFn()`) gets flagged; deferring the call with
  `setTimeout(() => void someAsyncFn(), 0)` (with cleanup via `clearTimeout`) satisfies the rule
  because the rule doesn't trace into timer callbacks. This does **not** apply to calls from event
  handlers (`onClick`, `onSubmit`, etc.) — those are always allowed regardless of what they call.
- Next.js file conventions `icon.png`, `apple-icon.png`, and `opengraph-image.tsx` under `src/app/`
  auto-inject the relevant `<link>`/`<meta>` tags — no manual metadata wiring needed. If only
  `opengraph-image` exists (no `twitter-image`), Twitter/X falls back to it automatically for
  `twitter:image`.
- `opengraph-image.tsx` needs `export const runtime = "nodejs";` if it reads local files via
  `node:fs` (the default Edge runtime doesn't support `fs`).
