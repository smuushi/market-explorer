"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Search } from "lucide-react";

import { CompareSkeleton, PanelSkeleton } from "@/components/compare-skeleton";
import { CompareView } from "@/components/compare-view";
import { MarketOptionPicker } from "@/components/market-option-picker";
import { MarketPanel } from "@/components/market-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResolveResponseSchema, SuggestResponseSchema } from "@/lib/types";
import type { Market } from "@/lib/types";
import { platformLabel } from "@/lib/utils";

interface Slot {
  market: Market;
  options: Market[];
}

type Status = "idle" | "loading" | "resolved" | "error";

interface Example {
  label: string;
  left: string;
  right?: string;
}

const EXAMPLES: Example[] = [
  {
    label: "Fed rate decision — Oct 2026",
    left: "https://polymarket.com/event/fed-decision-in-october-20260617190323537",
  },
  {
    label: "US recession by 2026",
    left: "https://polymarket.com/event/us-recession-by-end-of-2026",
    right: "https://kalshi.com/markets/kxrecssnber/recession-this-year",
  },
];

async function resolveUrl(url: string): Promise<{ market: Market; alternates: Market[] }> {
  const res = await fetch("/api/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Could not resolve that link.");
  return ResolveResponseSchema.parse(body);
}

async function suggestMatch(market: Market): Promise<{ candidates: Market[] }> {
  const res = await fetch("/api/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ market }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Could not find a match.");
  return SuggestResponseSchema.parse(body);
}

export function PasteForm({
  onHasResultsChange,
}: {
  onHasResultsChange?: (hasResults: boolean) => void;
}) {
  const [leftUrl, setLeftUrl] = useState("");
  const [rightUrl, setRightUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [left, setLeft] = useState<Slot | null>(null);
  const [right, setRight] = useState<Slot | null>(null);
  const [rightMode, setRightMode] = useState<"auto" | "manual" | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    onHasResultsChange?.(started);
  }, [started, onHasResultsChange]);

  async function runCompare(a: string, b: string) {
    if (!a && !b) {
      setStatus("error");
      setErrorMessage("Paste at least one Polymarket or Kalshi market link.");
      return;
    }

    setStarted(true);
    setStatus("loading");
    setErrorMessage(null);

    try {
      if (a && b) {
        setLoadingLabel("Resolving both markets…");
        const [resolvedA, resolvedB] = await Promise.all([resolveUrl(a), resolveUrl(b)]);
        setLeft({ market: resolvedA.market, options: resolvedA.alternates });
        setRight({ market: resolvedB.market, options: resolvedB.alternates });
        setRightMode("manual");
      } else {
        setLoadingLabel("Resolving market…");
        const resolved = await resolveUrl(a || b);
        setLeft({ market: resolved.market, options: resolved.alternates });
        setLoadingLabel(
          `Searching ${resolved.market.platform === "polymarket" ? "Kalshi" : "Polymarket"} for a match…`,
        );
        const suggestion = await suggestMatch(resolved.market);
        if (suggestion.candidates.length === 0) {
          setRight(null);
          setRightMode(null);
          setStatus("error");
          setErrorMessage(
            "Found the market, but couldn't find a confident match on the other platform. Try pasting both links manually.",
          );
          return;
        }
        setRight({ market: suggestion.candidates[0], options: suggestion.candidates.slice(1) });
        setRightMode("auto");
      }
      setStatus("resolved");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoadingLabel(null);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void runCompare(leftUrl.trim(), rightUrl.trim());
  }

  function handleExample(example: Example) {
    setLeftUrl(example.left);
    setRightUrl(example.right ?? "");
    void runCompare(example.left, example.right ?? "");
  }

  function handleReset() {
    setLeftUrl("");
    setRightUrl("");
    setStatus("idle");
    setErrorMessage(null);
    setLeft(null);
    setRight(null);
    setRightMode(null);
    setStarted(false);
  }

  function swapSlot(slot: Slot, option: Market): Slot {
    return {
      market: option,
      options: [slot.market, ...slot.options.filter((candidate) => candidate.id !== option.id)],
    };
  }

  async function handleSelectLeft(option: Market) {
    if (!left) return;
    const nextLeft = swapSlot(left, option);
    setLeft(nextLeft);

    if (rightMode === "auto") {
      setStatus("loading");
      setLoadingLabel(
        `Searching ${option.platform === "polymarket" ? "Kalshi" : "Polymarket"} for a match…`,
      );
      try {
        const suggestion = await suggestMatch(option);
        if (suggestion.candidates.length > 0) {
          setRight({ market: suggestion.candidates[0], options: suggestion.candidates.slice(1) });
        } else {
          setRight(null);
          setRightMode(null);
        }
        setStatus("resolved");
      } catch {
        setRight(null);
        setRightMode(null);
        setStatus("resolved");
      } finally {
        setLoadingLabel(null);
      }
    }
  }

  function handleSelectRight(option: Market) {
    if (!right) return;
    setRight(swapSlot(right, option));
  }

  const isLoading = status === "loading";
  const showExamples = !started;

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Paste a Polymarket link…"
            value={leftUrl}
            onChange={(event) => setLeftUrl(event.target.value)}
            disabled={isLoading}
          />
          <Input
            placeholder="Paste a Kalshi link… (optional)"
            value={rightUrl}
            onChange={(event) => setRightUrl(event.target.value)}
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted" aria-live="polite">
            {isLoading && loadingLabel
              ? loadingLabel
              : "Paste one link and we'll suggest the closest match on the other platform, or paste both for a direct comparison."}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {started ? (
              <Button type="button" variant="ghost" size="default" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            ) : null}
            <Button type="submit" disabled={isLoading} className="shrink-0">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Compare
            </Button>
          </div>
        </div>
      </form>

      {showExamples ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Try an example:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => handleExample(example)}
              className="rounded-full border border-edge px-3 py-1.5 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              {example.label}
            </button>
          ))}
        </div>
      ) : null}

      {status === "error" && errorMessage ? (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {errorMessage}
        </div>
      ) : null}

      {left && left.options.length > 0 ? (
        <MarketOptionPicker
          label={`Other ${platformLabel(left.market.platform)} outcomes in this event`}
          current={left.market}
          options={left.options}
          onSelect={handleSelectLeft}
        />
      ) : null}

      {right && right.options.length > 0 ? (
        <MarketOptionPicker
          label={
            rightMode === "auto"
              ? `Other suggested ${platformLabel(right.market.platform)} matches`
              : `Other ${platformLabel(right.market.platform)} outcomes in this event`
          }
          current={right.market}
          options={right.options}
          onSelect={handleSelectRight}
        />
      ) : null}

      {left && right ? (
        <CompareView left={left.market} right={right.market} />
      ) : isLoading && left ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MarketPanel market={left.market} />
          <PanelSkeleton />
        </div>
      ) : isLoading && started ? (
        <CompareSkeleton />
      ) : null}
    </div>
  );
}
