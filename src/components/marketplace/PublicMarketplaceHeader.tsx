"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";

export function PublicMarketplaceHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" aria-label="FeyseFit home">
          <BrandLogo className="text-xl" />
        </Link>
        <nav className="flex items-center gap-3 text-sm sm:gap-4" aria-label="Public marketplace">
          <Link href="/" className="font-medium text-primary/70 transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="/login" className="font-medium text-primary/70 transition-colors hover:text-primary">
            Sign In
          </Link>
          <Link
            href="/account/client"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[#9a7201]"
          >
            Create Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
