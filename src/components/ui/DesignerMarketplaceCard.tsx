"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./Button";
import type { Designer } from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";
import {
  formatDesignerLocationLine,
  getDesignerMarketplaceMeta,
  shouldShowCustomerMarketplaceCTAs,
} from "@/lib/marketplace-display";
import { MapPin, Star, BadgeCheck } from "lucide-react";

export function DesignerMarketplaceCard({ designer }: { designer: Designer }) {
  const { role } = useApp();
  const showCustomerCTAs = shouldShowCustomerMarketplaceCTAs(role);
  const profileHref = `/marketplace/${designer.id}`;
  const requestHref = `/marketplace/${designer.id}/request`;
  const meta = getDesignerMarketplaceMeta(designer.id);
  const locationLine = formatDesignerLocationLine(designer);

  return (
    <article className="overflow-hidden rounded-2xl bg-card shadow-sm transition-all hover:shadow-md">
      <Link href={profileHref} className="relative block aspect-4/3 w-full">
        <Image
          src={designer.coverImage}
          alt={designer.businessName}
          fill
          sizes="(max-width: 768px) 100vw, 22rem"
          className="object-cover transition-transform duration-300 hover:scale-[1.02]"
        />
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
          <Star className="h-3.5 w-3.5 fill-accent text-accent" />
          {designer.rating}
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <div>
          <Link href={profileHref} className="group inline-flex items-center gap-1.5">
            <h3 className="font-headline text-lg font-semibold text-primary group-hover:text-accent">
              {designer.businessName}
            </h3>
            <BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-label="Verified" />
          </Link>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/50 lg:hidden">
            {designer.specialty}
          </p>
          <p className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.15em] text-primary/50 lg:block">
            {locationLine}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-primary/55 lg:hidden">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {designer.location}
          </p>
        </div>

        <div className="hidden flex-wrap gap-2 lg:flex">
          {meta.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md border border-primary/10 bg-background/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary/65"
            >
              {tag}
            </span>
          ))}
        </div>

        {showCustomerCTAs ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={requestHref} className="flex-1 lg:order-2">
              <Button size="sm" className="w-full">
                Request Design
              </Button>
            </Link>
            <Link href={profileHref} className="flex-1 lg:order-1">
              <Button variant="secondary" size="sm" className="w-full bg-background/50">
                View Profile
              </Button>
            </Link>
          </div>
        ) : (
          <Link href={profileHref}>
            <Button variant="secondary" size="sm" className="w-full bg-background/50">
              View Profile
            </Button>
          </Link>
        )}
      </div>
    </article>
  );
}
