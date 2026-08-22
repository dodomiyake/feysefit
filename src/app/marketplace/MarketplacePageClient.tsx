"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Lock, Search, Shield } from "lucide-react";
import { DesignerMarketplaceCard } from "@/components/ui/DesignerMarketplaceCard";
import { Button } from "@/components/ui/Button";
import { MarketplaceFilters } from "@/components/marketplace/MarketplaceFilters";
import { MarketplaceGate } from "@/components/customer/MarketplaceGate";
import { MarketplaceAppShell } from "@/components/marketplace/MarketplaceAppShell";
import { useApp } from "@/context/AppContext";
import { filterMarketplaceDesigners } from "@/lib/marketplace-filters";
import {
  marketplaceBackHref,
  marketplaceDirectoryState,
  type MarketplaceCategory,
  type MarketplacePriceRangeFilter,
  type MarketplaceRatingFilter,
} from "@/lib/marketplace-display";

const INITIAL_VISIBLE = 6;

function marketplaceHref(query: string) {
  const params = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search
  );
  const trimmed = query.trim();
  if (trimmed) params.set("q", trimmed);
  else params.delete("q");
  const qs = params.toString();
  return qs ? `/marketplace?${qs}` : "/marketplace";
}

export function MarketplacePageClient({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<MarketplaceCategory>("All");
  const [location, setLocation] = useState("global");
  const [minRating, setMinRating] = useState<MarketplaceRatingFilter>("all");
  const [priceRange, setPriceRange] = useState<MarketplacePriceRangeFilter>("all");
  const [inPersonOnly, setInPersonOnly] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [search, setSearch] = useState(initialQuery);
  const [queryFromServer, setQueryFromServer] = useState(initialQuery);
  if (initialQuery !== queryFromServer) {
    setQueryFromServer(initialQuery);
    setSearch(initialQuery);
  }
  const { canAccessMarketplace, getLiveMarketplaceDesigners, marketplaceReady, marketplaceError, role } =
    useApp();
  const backHref = marketplaceBackHref(role);

  const liveDesigners = getLiveMarketplaceDesigners();

  const filtered = useMemo(
    () =>
      filterMarketplaceDesigners(liveDesigners, {
        search,
        category,
        location,
        minRating,
        priceRange,
        inPersonOnly,
      }),
    [liveDesigners, search, category, location, minRating, priceRange, inPersonOnly]
  );

  const visibleDesigners = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;
  const directoryState = marketplaceDirectoryState({
    marketplaceReady,
    marketplaceError,
    liveCount: liveDesigners.length,
    filteredCount: filtered.length,
  });

  if (!canAccessMarketplace) {
    return (
      <MarketplaceAppShell title="Marketplace" backHref={backHref}>
        <MarketplaceGate>{null}</MarketplaceGate>
      </MarketplaceAppShell>
    );
  }

  return (
    <MarketplaceAppShell title="Marketplace" backHref={backHref}>
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-8 lg:py-10">
        <div className="mb-8 lg:mb-10">
          <div className="lg:hidden">
            <h1 className="font-headline text-3xl font-bold text-primary">Marketplace</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-primary/60">
              Connect with world-class artisans and custom designers to bring your unique vision
              to life.
            </p>
          </div>

          <div className="hidden lg:block">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-primary">
              Discover Artisans
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-primary/60">
              Connect with the world&apos;s most elite couturiers and technical fashion designers
              for your next masterpiece.
            </p>
          </div>
        </div>

        <div className="relative mb-6 lg:hidden">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/40" />
          <input
            value={search}
            placeholder="Search artisans, styles, or ateliers..."
            className="w-full rounded-full border border-primary/15 bg-background py-3 pl-11 pr-4 text-sm text-primary placeholder:text-primary/40 focus:border-highlight focus:outline-none focus:ring-2 focus:ring-highlight/20"
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              router.replace(marketplaceHref(value), { scroll: false });
            }}
          />
        </div>

        <MarketplaceFilters
          designers={liveDesigners}
          category={category}
          location={location}
          minRating={minRating}
          priceRange={priceRange}
          inPersonOnly={inPersonOnly}
          onCategoryChange={(value) => {
            setCategory(value);
            setVisibleCount(INITIAL_VISIBLE);
          }}
          onLocationChange={(value) => {
            setLocation(value);
            setVisibleCount(INITIAL_VISIBLE);
          }}
          onMinRatingChange={(value) => {
            setMinRating(value);
            setVisibleCount(INITIAL_VISIBLE);
          }}
          onPriceRangeChange={(value) => {
            setPriceRange(value);
            setVisibleCount(INITIAL_VISIBLE);
          }}
          onInPersonOnlyChange={(value) => {
            setInPersonOnly(value);
            setVisibleCount(INITIAL_VISIBLE);
          }}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced((open) => !open)}
          onClearAdvanced={() => {
            setLocation("global");
            setMinRating("all");
            setPriceRange("all");
            setInPersonOnly(false);
            setVisibleCount(INITIAL_VISIBLE);
          }}
        />

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/10 bg-card/60 px-4 py-4 lg:hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background">
            <Lock className="h-4 w-4 text-accent" />
          </div>
          <p className="text-xs leading-relaxed text-primary/65">
            Private customer details are never shown publicly. Your security and anonymity are our
            priority.
          </p>
        </div>

        <div className="mt-6 hidden items-center gap-2 rounded-xl bg-highlight/10 px-4 py-3 lg:flex">
          <Shield className="h-4 w-4 shrink-0 text-accent" />
          <p className="text-xs text-primary/70">
            Private customer details are never shown publicly.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 justify-center gap-6 md:grid-cols-[repeat(auto-fit,minmax(20rem,22rem))]">
          {directoryState === "loading" ? (
            <p className="col-span-full rounded-2xl bg-card p-10 text-center text-sm text-primary/60">
              Loading designers...
            </p>
          ) : directoryState === "error" ? (
            <p className="col-span-full rounded-2xl bg-card p-10 text-center text-sm text-primary/60">
              We couldn’t load the marketplace. Please refresh and try again.
            </p>
          ) : directoryState === "empty-live" ? (
            <p className="col-span-full rounded-2xl bg-card p-10 text-center text-sm text-primary/60">
              No designers are listed on the marketplace yet.
            </p>
          ) : directoryState === "empty-filters" ? (
            <p className="col-span-full rounded-2xl bg-card p-10 text-center text-sm text-primary/60">
              No artisans match your filters. Try adjusting category, location, or rating.
            </p>
          ) : (
            visibleDesigners.map((designer) => (
              <DesignerMarketplaceCard key={designer.id} designer={designer} />
            ))
          )}
        </div>

        {directoryState === "results" && hasMore && (
          <div className="mt-10 flex justify-center">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="gap-2 bg-background/80 px-10"
              onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE)}
            >
              Discover More Designers
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </MarketplaceAppShell>
  );
}
