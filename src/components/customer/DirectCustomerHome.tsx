"use client";

import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DirectCustomerHome() {
  return (
    <div className="rounded-2xl border border-primary/10 bg-card/40 p-8 text-center lg:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-highlight/15">
        <Sparkles className="h-7 w-7 text-accent" />
      </div>
      <h2 className="mt-5 font-headline text-2xl font-bold text-primary">
        Find your designer on the marketplace
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-primary/60">
        Browse verified artisans, view portfolios, and send a design request. Once you connect with
        a designer, your project dashboard will appear here.
      </p>
      <Link href="/marketplace" className="mt-8 inline-block">
        <Button variant="zinc" size="lg" className="gap-2">
          <Search className="h-4 w-4" />
          Browse Marketplace
        </Button>
      </Link>
    </div>
  );
}
