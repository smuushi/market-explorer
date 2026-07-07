import { ExternalLink } from "lucide-react";

import { PlatformBadge } from "@/components/platform-badge";
import { Sparkline } from "@/components/sparkline";
import { Card } from "@/components/ui/card";
import type { Market } from "@/lib/types";
import { cn, formatDate, formatPercent, formatUsd } from "@/lib/utils";

const STATUS_LABEL: Record<Market["status"], string> = {
  open: "Open",
  closed: "Closed",
  settled: "Settled",
  unknown: "Unknown",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-tabular text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function MarketPanel({ market }: { market: Market }) {
  const accentColor = market.platform === "polymarket" ? "#4c8bf5" : "#22c58b";

  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <PlatformBadge platform={market.platform} />
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            market.status === "open"
              ? "border-kalshi/30 text-kalshi"
              : "border-edge text-muted",
          )}
        >
          {STATUS_LABEL[market.status]}
        </span>
      </div>

      <div>
        {market.groupTitle && market.groupTitle !== market.title ? (
          <div className="mb-1 text-xs text-muted">{market.groupTitle}</div>
        ) : null}
        <h3 className="text-balance text-lg font-semibold leading-snug text-foreground">
          {market.title}
        </h3>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="font-tabular text-4xl font-bold text-foreground">
          {formatPercent(market.yesProbability)}
        </span>
        <span className="text-sm text-muted">chance of Yes</span>
      </div>

      <Sparkline data={market.priceHistory} color={accentColor} />

      <div className="grid grid-cols-2 gap-4 border-t border-edge pt-4 sm:grid-cols-3">
        <Stat label="Volume" value={formatUsd(market.volume)} />
        <Stat label="24h Volume" value={formatUsd(market.volume24hr)} />
        <Stat label={market.liquidityLabel} value={formatUsd(market.liquidity)} />
        <Stat label="Spread" value={formatPercent(market.spread)} />
        <Stat label="Closes" value={formatDate(market.closeDate)} />
        <Stat label="No" value={formatPercent(market.noProbability)} />
      </div>

      <a
        href={market.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
      >
        View on {market.platform === "polymarket" ? "Polymarket" : "Kalshi"}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </Card>
  );
}
