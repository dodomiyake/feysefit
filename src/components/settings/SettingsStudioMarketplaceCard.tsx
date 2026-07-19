"use client";

import { MapPin, Store } from "lucide-react";

interface SettingsStudioMarketplaceCardProps {
  city: string;
  country: string;
  offersInPerson: boolean;
  priceRangeMin: string;
  priceRangeMax: string;
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onOffersInPersonChange: (value: boolean) => void;
  onPriceRangeMinChange: (value: string) => void;
  onPriceRangeMaxChange: (value: string) => void;
}

const fieldClass =
  "w-full rounded-lg border border-primary/15 bg-background px-3 py-2.5 text-sm text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function SettingsStudioMarketplaceCard({
  city,
  country,
  offersInPerson,
  priceRangeMin,
  priceRangeMax,
  onCityChange,
  onCountryChange,
  onOffersInPersonChange,
  onPriceRangeMinChange,
  onPriceRangeMaxChange,
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
            filters. When in-person appointments are enabled, app clients can request visits from your
            marketplace profile. Click <span className="font-medium text-primary">Save Changes</span> at
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
