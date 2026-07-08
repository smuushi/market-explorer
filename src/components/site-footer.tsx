import Link from "next/link";

export function SiteFooter() {
  return (
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
      Polymarket or Kalshi ·{" "}
      <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
        About
      </Link>
    </footer>
  );
}
