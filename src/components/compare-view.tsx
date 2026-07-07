import { DeltaStrip } from "@/components/delta-strip";
import { MarketPanel } from "@/components/market-panel";
import type { Market } from "@/lib/types";

export function CompareView({ left, right }: { left: Market; right: Market }) {
  return (
    <div className="flex flex-col gap-4">
      <DeltaStrip left={left} right={right} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MarketPanel market={left} />
        <MarketPanel market={right} />
      </div>
    </div>
  );
}
