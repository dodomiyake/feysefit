"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

const publicNavLinks = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Sign In" },
];

export function PublicMarketplaceHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link href="/" aria-label="FeyseFit home" onClick={closeMobileMenu}>
          <BrandLogo className="text-xl" />
        </Link>

        <nav className="hidden items-center gap-4 text-sm md:flex" aria-label="Public marketplace">
          {publicNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-primary/70 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/account/client"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#9a7201]"
          >
            Create Account
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-card text-primary transition-colors hover:bg-primary hover:text-white md:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <nav
          className="border-t border-primary/10 bg-background px-5 py-4 shadow-sm md:hidden"
          aria-label="Mobile public marketplace"
        >
          <div className="flex flex-col gap-2">
            {publicNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-primary/75 transition-colors hover:bg-primary/5 hover:text-primary"
                onClick={closeMobileMenu}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/account/client"
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#9a7201]"
              onClick={closeMobileMenu}
            >
              Create Account
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
