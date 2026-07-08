import { cn, formatPercent } from "@/lib/utils";
import type { Market } from "@/lib/types";

interface MarketOptionPickerProps {
  label: string;
  current: Market;
  /** Every option in this group, including the current selection, in a fixed display order
   * that must not change when the selection changes — reordering on select is the exact
   * "slingshot" UX bug this component previously had. */
  options: Market[];
  onSelect: (market: Market) => void;
}

export function MarketOptionPicker({ label, current, options, onSelect }: MarketOptionPickerProps) {
  const seen = new Set<string>();
  const all = options.filter((option) => {
    if (seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });

  if (all.length <= 1) return null;

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
                  ? "border-foreground/60 bg-surface-hover text-foreground ring-1 ring-foreground/20"
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
