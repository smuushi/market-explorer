import { PasteForm } from "@/components/paste-form";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-edge">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-10">
          <div className="flex items-center gap-2 text-sm font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-polymarket" />
            <span className="h-1.5 w-1.5 rounded-full bg-kalshi" />
            Parity
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Same question, two markets.
          </h1>
          <p className="max-w-xl text-sm text-muted">
            Paste a Polymarket or Kalshi market link. Parity fetches live pricing, volume, and
            liquidity, then finds the equivalent market on the other platform for an instant
            side-by-side comparison.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <PasteForm />
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
