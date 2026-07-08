"use client";

import Image from "next/image";
import { useState } from "react";

import { PasteForm } from "@/components/paste-form";
import { cn } from "@/lib/utils";

export default function Home() {
  const [hasResults, setHasResults] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-edge">
        <div
          className={cn(
            "mx-auto flex max-w-5xl flex-col gap-2 px-6 transition-[padding] duration-200",
            hasResults ? "py-5" : "py-10",
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-muted">
            <Image
              src="/logo.png"
              alt="Parity logo"
              width={20}
              height={20}
              className="rounded-md"
              priority
            />
            Parity
          </div>
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
              Paste a Polymarket or Kalshi market link. Parity fetches live pricing, volume, and
              liquidity, then finds the equivalent market on the other platform for an instant
              side-by-side comparison.
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <PasteForm onHasResultsChange={setHasResults} />
      </main>

      <footer className="border-t border-edge px-6 py-6 text-center text-xs text-muted">
        Built by{" "}
        <a
          href="https://github.com/smuushi"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Michael Shih
        </a>{" "}
        · Data via the public Polymarket Gamma/CLOB and Kalshi Trade APIs · Not affiliated with
        Polymarket or Kalshi
      </footer>
    </div>
  );
}
