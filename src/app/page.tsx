"use client";

import { Suspense, useState } from "react";

import { PasteForm } from "@/components/paste-form";
import { cn } from "@/lib/utils";

export default function Home() {
  const [hasResults, setHasResults] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-edge">
        <div
          className={cn(
            "mx-auto flex max-w-5xl flex-col gap-2 px-6 transition-[padding] duration-200",
            hasResults ? "py-5" : "py-10",
          )}
        >
          <h1
            className={cn(
              "font-bold tracking-tight text-foreground transition-all duration-200",
              hasResults ? "text-lg" : "text-2xl sm:text-3xl",
            )}
          >
            Same question, two markets.
          </h1>
          {hasResults ? null : (
            <p className="max-w-xl text-sm text-muted">
              Paste a Polymarket or Kalshi market link. PolyComparison fetches live pricing,
              volume, and liquidity, then finds the equivalent market on the other platform for an
              instant side-by-side comparison.
            </p>
          )}
        </div>
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Suspense fallback={null}>
          <PasteForm onHasResultsChange={setHasResults} />
        </Suspense>
      </main>
    </div>
  );
}
