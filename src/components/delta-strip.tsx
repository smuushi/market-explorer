import { Card } from "@/components/ui/card";
import type { Market } from "@/lib/types";
import { formatDate, formatPercent, formatUsd } from "@/lib/utils";

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const dateA = new Date(a).getTime();
  const dateB = new Date(b).getTime();
  if (Number.isNaN(dateA) || Number.isNaN(dateB)) return null;
  return Math.round((dateA - dateB) / (1000 * 60 * 60 * 24));
}

export function DeltaStrip({ left, right }: { left: Market; right: Market }) {
  const probabilityGap =
    left.yesProbability !== null && right.yesProbability !== null
      ? Math.abs(left.yesProbability - right.yesProbability)
      : null;

  const dayDiff = daysBetween(left.closeDate, right.closeDate);
  const volumeDiff =
    left.volume !== null && right.volume !== null ? left.volume - right.volume : null;

  return (
    <Card className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted">Probability Gap</div>
        <div className="font-tabular text-2xl font-bold text-foreground">
          {formatPercent(probabilityGap)}
        </div>
        <div className="text-xs text-muted">Implied disagreement between platforms</div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted">Volume Difference</div>
        <div className="font-tabular text-2xl font-bold text-foreground">
          {volumeDiff === null ? "—" : formatUsd(Math.abs(volumeDiff))}
        </div>
        <div className="text-xs text-muted">
          {volumeDiff === null
            ? "Unavailable"
            : `More volume on ${volumeDiff >= 0 ? left.platform : right.platform}`}
        </div>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted">Resolution Dates</div>
        <div className="font-tabular text-2xl font-bold text-foreground">
          {dayDiff === null ? "—" : `${Math.abs(dayDiff)}d apart`}
        </div>
        <div className="text-xs text-muted">
          {formatDate(left.closeDate)} vs {formatDate(right.closeDate)}
        </div>
      </div>
    </Card>
  );
}
