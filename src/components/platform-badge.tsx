import type { Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLATFORM_LABEL: Record<Platform, string> = {
  polymarket: "Polymarket",
  kalshi: "Kalshi",
};

export function PlatformBadge({ platform, className }: { platform: Platform; className?: string }) {
  const isPoly = platform === "polymarket";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        isPoly
          ? "border-polymarket/30 bg-polymarket/10 text-polymarket"
          : "border-kalshi/30 bg-kalshi/10 text-kalshi",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", isPoly ? "bg-polymarket" : "bg-kalshi")} />
      {PLATFORM_LABEL[platform]}
    </span>
  );
}
