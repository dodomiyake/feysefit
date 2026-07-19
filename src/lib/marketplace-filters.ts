import type { Designer } from "@/lib/mock-data";
import {
  designerMatchesLocation,
  designerMatchesPriceRange,
  getDesignerMarketplaceMeta,
  type MarketplaceCategory,
  type MarketplacePriceRangeFilter,
  type MarketplaceRatingFilter,
} from "@/lib/marketplace-display";

export interface MarketplaceFilterState {
  search: string;
  category: MarketplaceCategory;
  location: string;
  minRating: MarketplaceRatingFilter;
  priceRange: MarketplacePriceRangeFilter;
  inPersonOnly: boolean;
}

export function filterMarketplaceDesigners(
  designers: Designer[],
  filters: MarketplaceFilterState
): Designer[] {
  const query = filters.search.trim().toLowerCase();

  return designers.filter((designer) => {
    const meta = getDesignerMarketplaceMeta(designer.id);

    if (query) {
      const haystack = [
        designer.businessName,
        designer.designerName,
        designer.specialty,
        designer.location,
        designer.city,
        designer.country,
        meta.tags.join(" "),
        meta.category,
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(query)) return false;
    }

    if (filters.category !== "All" && meta.category !== filters.category) {
      return false;
    }

    if (!designerMatchesLocation(designer, filters.location)) {
      return false;
    }

    if (filters.minRating !== "all") {
      const minimum = Number.parseFloat(filters.minRating);
      if (designer.rating < minimum) return false;
    }

    if (!designerMatchesPriceRange(designer, filters.priceRange)) {
      return false;
    }

    if (filters.inPersonOnly && !designer.offersInPersonAppointments) {
      return false;
    }

    return true;
  });
}
