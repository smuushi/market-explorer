import { cn, formatPercent } from "@/lib/utils";
import type { Market } from "@/lib/types";

interface MarketOptionPickerProps {
  label: string;
  current: Market;
  options: Market[];
  onSelect: (market: Market) => void;
}

export function MarketOptionPicker({ label, current, options, onSelect }: MarketOptionPickerProps) {
  if (options.length === 0) return null;

  const seen = new Set<string>();
  const all = [current, ...options].filter((option) => {
    if (seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="flex flex-wrap gap-2">
        {all.map((option) => {
          const isActive = option.id === current.id;
          const displayLabel = option.optionLabel || option.title;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option)}
              title={option.title}
              className={cn(
                "flex max-w-[220px] items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs transition-colors",
                isActive
                  ? "border-foreground/50 bg-surface-hover text-foreground"
                  : "border-edge text-muted hover:border-foreground/30 hover:text-foreground",
              )}
            >
              <span className="truncate">{displayLabel}</span>
              <span className="font-tabular shrink-0 font-semibold">
                {formatPercent(option.yesProbability)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
