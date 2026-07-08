import { ExternalLink, FolderGit2 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

import { PlatformBadge } from "@/components/platform-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About — PolyComparison",
  description:
    "How PolyComparison compares Polymarket and Kalshi odds, how cross-platform matching works, and where the data comes from.",
};

function ExternalLinkPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-hover"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          About PolyComparison
        </h1>
        <p className="text-sm leading-relaxed text-muted">
          PolyComparison is a small, on-demand explorer for prediction markets — paste a
          Polymarket or Kalshi link and instantly see how the other platform prices the same
          real-world question, in the spirit of an Etherscan or CoinMarketCap page, but for
          prediction markets.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-6">
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            How it works
          </h2>
          <ol className="flex flex-col gap-3">
            {[
              "Paste a Polymarket or Kalshi market link.",
              "The server resolves it against the platform's public API and normalizes price, volume, liquidity, spread, and resolution date into one shared shape.",
              "It searches the other platform for the closest matching market and shows a ranked list of candidates.",
              "You get a side-by-side comparison — probability gap, volume difference, resolution-date gap, and a one-line verdict on which platform offers the better price to buy Yes.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-foreground">
                <span className="font-tabular shrink-0 font-semibold text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            How matching works
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            Neither platform&apos;s data schema knows about the other, so matching is a two-stage
            hybrid, not a guarantee: a fast, free heuristic shortlist ranks candidates by title
            similarity, then a small AI model (<code className="text-xs">gpt-5.4-mini</code>)
            re-ranks ambiguous cases by judging whether two markets are actually about the same
            underlying event — not just sharing keywords. If no{" "}
            <code className="text-xs">OPENAI_API_KEY</code> is configured, matching falls back to
            the heuristic alone. The UI always shows the next-best alternatives, so you can
            override the pick either way.
          </p>
          <a
            href="https://github.com/smuushi/market-explorer#matching-honestly"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Read the full breakdown on GitHub
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Data sources
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            All data is fetched live from each platform&apos;s public, unauthenticated
            market-data API — no scraping, no private endpoints, no stored history.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <PlatformBadge platform="polymarket" />
              <a
                href="https://docs.polymarket.com/market-data/overview"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                Gamma + CLOB API docs
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <PlatformBadge platform="kalshi" />
              <a
                href="https://docs.kalshi.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                Trade API v2 docs
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <p className="text-xs text-muted">
            PolyComparison is not affiliated with, endorsed by, or built using non-public data
            from Polymarket or Kalshi.
          </p>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Open source
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            Both the web app and its CLI sibling are open source under the same author.
          </p>
          <div className="flex flex-wrap gap-2">
            <ExternalLinkPill href="https://github.com/smuushi/market-explorer">
              <FolderGit2 className="h-3.5 w-3.5" />
              market-explorer (this site)
            </ExternalLinkPill>
            <ExternalLinkPill href="https://github.com/smuushi/parity-cli">
              <FolderGit2 className="h-3.5 w-3.5" />
              parity-cli (terminal + agent tool)
            </ExternalLinkPill>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Built by
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            Michael Shih — a software engineer building web security and trust & safety tooling.
            This project started as a way to explore the Polymarket and Kalshi public APIs
            hands-on.
          </p>
          <div className="flex flex-wrap gap-2">
            <ExternalLinkPill href="https://github.com/smuushi">
              <FolderGit2 className="h-3.5 w-3.5" />
              GitHub
            </ExternalLinkPill>
            <ExternalLinkPill href="https://smuushi.dev">Portfolio</ExternalLinkPill>
          </div>
        </Card>
      </div>

      <div className="mt-10 flex justify-center">
        <Link href="/" className={buttonVariants({ variant: "primary" })}>
          Try a comparison
        </Link>
      </div>
    </main>
  );
}
