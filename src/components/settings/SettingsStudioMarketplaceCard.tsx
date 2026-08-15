"use client";

import { MapPin, Store } from "lucide-react";
import { DESIGNER_SERVICE_AREA_OPTIONS } from "@/lib/designer-profile-fields";
import { cn } from "@/lib/cn";

interface SettingsStudioMarketplaceCardProps {
  city: string;
  country: string;
  offersInPerson: boolean;
  priceRangeMin: string;
  priceRangeMax: string;
  bio: string;
  serviceAreas: string[];
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onOffersInPersonChange: (value: boolean) => void;
  onPriceRangeMinChange: (value: string) => void;
  onPriceRangeMaxChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onServiceAreasChange: (value: string[]) => void;
}

const fieldClass =
  "w-full rounded-lg border border-primary/15 bg-background px-3 py-2.5 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function SettingsStudioMarketplaceCard({
  city,
  country,
  offersInPerson,
  priceRangeMin,
  priceRangeMax,
  bio,
  serviceAreas,
  onCityChange,
  onCountryChange,
  onOffersInPersonChange,
  onPriceRangeMinChange,
  onPriceRangeMaxChange,
  onBioChange,
  onServiceAreasChange,
}: SettingsStudioMarketplaceCardProps) {
  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm lg:col-span-8 lg:p-8">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Store className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-primary">Studio & marketplace</h3>
          <p className="mt-1 text-sm text-primary/60">
            Help local and diaspora clients find you. City, country, and price range power marketplace
            filters. Biography and service areas appear on your public profile. Phone/contact stays
            private. Click <span className="font-medium text-primary">Save Changes</span> at
            the bottom of this page to keep updates.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 flex items-center gap-1.5 text-primary/60">
            <MapPin className="h-3.5 w-3.5" />
            City
          </span>
          <input
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="e.g. Lagos"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-primary/60">Country</span>
          <input
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            placeholder="e.g. Nigeria"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-primary/60">Price from (£)</span>
          <input
            type="number"
            min="0"
            step="50"
            value={priceRangeMin}
            onChange={(e) => onPriceRangeMinChange(e.target.value)}
            placeholder="e.g. 500"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-primary/60">Price to (£)</span>
          <input
            type="number"
            min="0"
            step="50"
            value={priceRangeMax}
            onChange={(e) => onPriceRangeMaxChange(e.target.value)}
            placeholder="e.g. 5000"
            className={fieldClass}
          />
        </label>
      </div>

      <label className="mt-5 block text-sm">
        <span className="mb-1 block text-primary/60">Biography</span>
        <textarea
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          rows={5}
          placeholder="Tell clients about your craft, experience, and style..."
          className={fieldClass}
        />
      </label>

      <div className="mt-5 space-y-2">
        <p className="text-sm text-primary/60">Service areas</p>
        <div className="flex flex-wrap gap-2">
          {DESIGNER_SERVICE_AREA_OPTIONS.map((area) => {
            const active = serviceAreas.includes(area);
            return (
              <button
                key={area}
                type="button"
                onClick={() =>
                  onServiceAreasChange(
                    active ? serviceAreas.filter((item) => item !== area) : [...serviceAreas, area]
                  )
                }
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  active
                    ? "border-accent bg-accent/15 text-primary"
                    : "border-primary/15 text-primary/70 hover:bg-surface"
                )}
              >
                {area}
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-primary/10 bg-background/50 px-4 py-3">
        <input
          type="checkbox"
          checked={offersInPerson}
          onChange={(e) => onOffersInPersonChange(e.target.checked)}
          className="h-4 w-4 rounded border-primary/20"
        />
        <span className="text-sm text-primary">
          Accept in-person appointments (measurement, fitting, pickup)
        </span>
      </label>
    </section>
  );
}
