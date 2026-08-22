"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Mail, ShieldCheck, Store } from "lucide-react";

const year = new Date().getFullYear();

export function PublicMarketplaceFooter() {
  return (
    <footer className="border-t border-primary/10 bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Link href="/" aria-label="FeyseFit home" className="inline-flex">
            <BrandLogo className="text-xl" />
          </Link>
          <p className="max-w-md text-sm leading-6 text-primary/65">
            Discover trusted fashion designers, manage custom outfit projects, and keep
            measurements, enquiries, and delivery updates organised in one place.
          </p>
          <div className="grid gap-3 text-xs text-primary/60 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-2xl border border-primary/10 bg-background/70 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>Private customer contact details are never shown publicly.</span>
            </div>
            <div className="flex items-start gap-2 rounded-2xl border border-primary/10 bg-background/70 p-3">
              <Store className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>Only approved designer profiles appear in the marketplace.</span>
            </div>
          </div>
        </div>

        <nav aria-label="Marketplace footer" className="space-y-3 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/45">
            Explore
          </h2>
          <div className="flex flex-col gap-2">
            <Link href="/marketplace" className="text-primary/70 transition-colors hover:text-primary">
              Marketplace
            </Link>
            <Link href="/account/designer" className="text-primary/70 transition-colors hover:text-primary">
              Become a Designer
            </Link>
            <Link href="/account/client" className="text-primary/70 transition-colors hover:text-primary">
              Create Account
            </Link>
            <Link href="/login" className="text-primary/70 transition-colors hover:text-primary">
              Sign In
            </Link>
          </div>
        </nav>

        <div className="space-y-3 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/45">
            Support
          </h2>
          <a
            href="mailto:support@feysefit.com"
            className="inline-flex items-center gap-2 text-primary/70 transition-colors hover:text-primary"
          >
            <Mail className="h-4 w-4" />
            Email Support
          </a>
          <p className="max-w-xs text-xs leading-5 text-primary/55">
            For beta access, designer onboarding, marketplace questions, or customer support.
          </p>
        </div>
      </div>

      <div className="border-t border-primary/10 px-5 py-5 text-center text-xs text-primary/50">
        © {year} FeyseFit. All rights reserved.
      </div>
    </footer>
  );
}
