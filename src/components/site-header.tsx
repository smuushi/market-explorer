import Image from "next/image";
import Link from "next/link";

import { NavLink } from "@/components/nav-link";

export function SiteHeader() {
  return (
    <header className="border-b border-edge">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-foreground/80"
        >
          <Image src="/logo.png" alt="" width={22} height={22} className="rounded-md" priority />
          PolyComparison
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink href="/">Compare</NavLink>
          <NavLink href="/about">About</NavLink>
        </nav>
      </div>
    </header>
  );
}
