import type { Designer } from "@/lib/mock-data";
import type { UserRole } from "@/lib/design-tokens";
import { getDashboardHref } from "@/lib/navigation";

export const marketplaceCategories = [
  "All",
  "Bespoke",
  "Ready-to-Wear",
  "Accessories",
] as const;

export type MarketplaceCategory = (typeof marketplaceCategories)[number];

export interface DesignerMarketplaceMeta {
  category: Exclude<MarketplaceCategory, "All">;
  tags: [string, string];
}

export const designerMarketplaceMeta: Record<string, DesignerMarketplaceMeta> = {
  "1": {
    category: "Bespoke",
    tags: ["Heritage Craft", "Eco-Textiles"],
  },
  "2": {
    category: "Bespoke",
    tags: ["Tech-Integrated", "Heritage Craft"],
  },
  "3": {
    category: "Ready-to-Wear",
    tags: ["Limited Edition", "Hand-Stitched"],
  },
};

export const marketplaceRatingOptions = [
  { value: "all", label: "Rating: Any" },
  { value: "4.5", label: "4.5+ stars" },
  { value: "4.8", label: "4.8+ stars" },
] as const;

export const marketplacePriceRangeOptions = [
  { value: "all", label: "Price: Any" },
  { value: "0-500", label: "Under £500" },
  { value: "500-1500", label: "£500 – £1,500" },
  { value: "1500-5000", label: "£1,500 – £5,000" },
  { value: "5000+", label: "£5,000+" },
] as const;

export type MarketplacePriceRangeFilter =
  (typeof marketplacePriceRangeOptions)[number]["value"];

export type MarketplaceRatingFilter = (typeof marketplaceRatingOptions)[number]["value"];

export interface MarketplaceLocationOption {
  value: string;
  label: string;
}

export function toLocationFilterValue(location: string): string {
  return location
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

export function buildMarketplaceLocationOptions(
  designers: Designer[]
): MarketplaceLocationOption[] {
  const options: MarketplaceLocationOption[] = [
    { value: "global", label: "Location: Global" },
  ];
  const seen = new Set<string>();

  for (const designer of designers) {
    const value = toLocationFilterValue(designer.location);
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: designer.location });
  }

  for (const designer of designers) {
    if (!designer.country) continue;
    const value = `country:${designer.country.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: `Country: ${designer.country}` });
  }

  return options;
}

export function getDesignerMarketplaceMeta(
  designerId: string
): DesignerMarketplaceMeta {
  return (
    designerMarketplaceMeta[designerId] ?? {
      category: "Bespoke",
      tags: ["Bespoke", "Custom"],
    }
  );
}

export function formatDesignerLocationLine(designer: Designer): string {
  const city = designer.location.split(",")[0]?.trim().toUpperCase() ?? "";
  const specialty = designer.specialty.toUpperCase();
  return `${city} • ${specialty}`;
}

export function designerMatchesLocation(
  designer: Designer,
  location: string
): boolean {
  if (location === "global") return true;
  if (location.startsWith("country:")) {
    const country = location.slice("country:".length);
    const designerCountry =
      designer.country?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ??
      designer.location.split(",").slice(-1)[0]?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return designerCountry === country;
  }
  return toLocationFilterValue(designer.location) === location;
}

export function designerMatchesPriceRange(
  designer: Designer,
  priceRange: MarketplacePriceRangeFilter
): boolean {
  if (priceRange === "all") return true;
  const min = designer.priceRangeMin ?? 0;
  const max = designer.priceRangeMax ?? Number.MAX_SAFE_INTEGER;

  if (priceRange === "0-500") return max <= 500 || (min <= 500 && max > 0);
  if (priceRange === "500-1500") return min <= 1500 && max >= 500;
  if (priceRange === "1500-5000") return min <= 5000 && max >= 1500;
  if (priceRange === "5000+") return max >= 5000 || min >= 5000;
  return true;
}

export function hasActiveAdvancedFilters(
  location: string,
  minRating: MarketplaceRatingFilter,
  priceRange: MarketplacePriceRangeFilter = "all",
  inPersonOnly = false
): boolean {
  return location !== "global" || minRating !== "all" || priceRange !== "all" || inPersonOnly;
}

/** Request design, message designer, and linked-customer prompts are customer-facing only. */
export function shouldShowCustomerMarketplaceCTAs(role: UserRole | null): boolean {
  return role !== "designer" && role !== "admin";
}

/** Signed-out visitors return to the public homepage; signed-in users return to their dashboard. */
export function marketplaceBackHref(role: UserRole | null): string {
  if (!role) return "/";
  return getDashboardHref(role);
}

export type MarketplaceDirectoryState =
  | "loading"
  | "error"
  | "empty-live"
  | "empty-filters"
  | "results";

/** Keep the empty-state copy from flashing while public marketplace data is still loading. */
export function marketplaceDirectoryState(input: {
  marketplaceReady: boolean;
  marketplaceError?: boolean;
  liveCount: number;
  filteredCount: number;
}): MarketplaceDirectoryState {
  if (!input.marketplaceReady) return "loading";
  if (input.marketplaceError) return "error";
  if (input.filteredCount > 0) return "results";
  if (input.liveCount === 0) return "empty-live";
  return "empty-filters";
}
