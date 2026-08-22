"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  buildMarketplaceLocationOptions,
  hasActiveAdvancedFilters,
  marketplaceCategories,
  marketplaceRatingOptions,
  marketplacePriceRangeOptions,
  type MarketplaceCategory,
  type MarketplaceLocationOption,
  type MarketplacePriceRangeFilter,
  type MarketplaceRatingFilter,
} from "@/lib/marketplace-display";
import type { Designer } from "@/lib/mock-data";

interface MarketplaceFiltersProps {
  designers: Designer[];
  category: MarketplaceCategory;
  location: string;
  minRating: MarketplaceRatingFilter;
  priceRange: MarketplacePriceRangeFilter;
  inPersonOnly: boolean;
  onCategoryChange: (category: MarketplaceCategory) => void;
  onLocationChange: (location: string) => void;
  onMinRatingChange: (rating: MarketplaceRatingFilter) => void;
  onPriceRangeChange: (range: MarketplacePriceRangeFilter) => void;
  onInPersonOnlyChange: (value: boolean) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  onClearAdvanced: () => void;
}

export function MarketplaceFilters({
  designers,
  category,
  location,
  minRating,
  priceRange,
  inPersonOnly,
  onCategoryChange,
  onLocationChange,
  onMinRatingChange,
  onPriceRangeChange,
  onInPersonOnlyChange,
  showAdvanced,
  onToggleAdvanced,
  onClearAdvanced,
}: MarketplaceFiltersProps) {
  const locationOptions: MarketplaceLocationOption[] =
    buildMarketplaceLocationOptions(designers);
  const advancedActive = hasActiveAdvancedFilters(location, minRating, priceRange, inPersonOnly);

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/10 bg-card/60 p-4 lg:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
        <div className="min-w-0 lg:flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/45 lg:hidden">
            Quick Filters
          </p>
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/45 lg:block">
            Category
          </p>
          <div
            className="-mx-1 mt-3 flex max-w-full gap-2 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0"
            aria-label="Marketplace category filters"
          >
            {marketplaceCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onCategoryChange(item)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors lg:px-5 lg:py-2.5",
                  category === item
                    ? "bg-zinc-900 text-white"
                    : "border border-primary/15 bg-background/80 text-primary/70 hover:border-primary/25 hover:text-primary"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <Button
          type="button"
          variant={advancedActive ? "primary" : "zinc"}
          size="sm"
          className="w-full shrink-0 gap-2 px-4 lg:w-auto lg:px-5"
          onClick={onToggleAdvanced}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Advanced Filters
          {advancedActive && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              On
            </span>
          )}
        </Button>
      </div>

      {showAdvanced && (
        <div className="mt-4 border-t border-primary/10 pt-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/50">
              Advanced filters
            </p>
            {advancedActive && (
              <button
                type="button"
                onClick={onClearAdvanced}
                className="text-xs font-medium text-accent hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <label className="relative min-w-[200px] flex-1">
              <span className="sr-only">Location</span>
              <select
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                className="w-full appearance-none rounded-full border border-primary/15 bg-background/80 py-2.5 pl-4 pr-10 text-sm text-primary focus:border-highlight focus:outline-none focus:ring-2 focus:ring-highlight/20"
              >
                {locationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/45" />
            </label>

            <label className="relative min-w-[200px] flex-1">
              <span className="sr-only">Minimum rating</span>
              <select
                value={minRating}
                onChange={(e) => onMinRatingChange(e.target.value as MarketplaceRatingFilter)}
                className="w-full appearance-none rounded-full border border-primary/15 bg-background/80 py-2.5 pl-4 pr-10 text-sm text-primary focus:border-highlight focus:outline-none focus:ring-2 focus:ring-highlight/20"
              >
                {marketplaceRatingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/45" />
            </label>

            <label className="relative min-w-[200px] flex-1">
              <span className="sr-only">Price range</span>
              <select
                value={priceRange}
                onChange={(e) =>
                  onPriceRangeChange(e.target.value as MarketplacePriceRangeFilter)
                }
                className="w-full appearance-none rounded-full border border-primary/15 bg-background/80 py-2.5 pl-4 pr-10 text-sm text-primary focus:border-highlight focus:outline-none focus:ring-2 focus:ring-highlight/20"
              >
                {marketplacePriceRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/45" />
            </label>

            <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-4 py-2.5 text-sm text-primary">
              <input
                type="checkbox"
                checked={inPersonOnly}
                onChange={(e) => onInPersonOnlyChange(e.target.checked)}
                className="h-4 w-4 rounded border-primary/20"
              />
              In-person appointments
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
