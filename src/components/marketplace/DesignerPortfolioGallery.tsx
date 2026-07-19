"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Designer } from "@/lib/mock-data";
import { getDesignerPortfolioGallery } from "@/lib/designer-profile-meta";
import { BackButton } from "@/components/ui/BackButton";
import { cn } from "@/lib/cn";
import { useApp } from "@/context/AppContext";
import { shouldShowCustomerMarketplaceCTAs } from "@/lib/marketplace-display";

interface DesignerPortfolioGalleryProps {
  designer: Designer;
}

export function DesignerPortfolioGallery({ designer }: DesignerPortfolioGalleryProps) {
  const { role } = useApp();
  const showCustomerCTAs = shouldShowCustomerMarketplaceCTAs(role);
  const pieces = getDesignerPortfolioGallery(designer.id, designer.portfolioImages);
  const collections = useMemo(() => {
    const names = pieces
      .map((p) => p.collection)
      .filter((c): c is string => Boolean(c));
    return ["All", ...Array.from(new Set(names))];
  }, [pieces]);
  const [activeCollection, setActiveCollection] = useState("All");

  const filtered =
    activeCollection === "All"
      ? pieces
      : pieces.filter((piece) => piece.collection === activeCollection);

  return (
    <div className="pb-28">
      <header className="border-b border-primary/10 bg-background/95 px-5 py-4 backdrop-blur-md lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <BackButton
            href={`/marketplace/${designer.id}`}
            variant="icon"
            ariaLabel="Back to designer profile"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/50">
              Full gallery
            </p>
            <h1 className="truncate font-headline text-xl font-semibold text-primary lg:text-2xl">
              {designer.businessName}
            </h1>
            <p className="text-sm text-primary/55">All collections · {pieces.length} pieces</p>
          </div>
          {showCustomerCTAs && (
            <Link
              href={`/marketplace/${designer.id}/request`}
              className="hidden rounded-full bg-primary px-5 py-2 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-opacity hover:opacity-90 sm:inline-block"
            >
              Request Design
            </Link>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-16">
        {collections.length > 2 && (
          <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
            {collections.map((collection) => (
              <button
                key={collection}
                type="button"
                onClick={() => setActiveCollection(collection)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                  activeCollection === collection
                    ? "bg-primary text-white"
                    : "bg-card text-primary/60 hover:text-primary"
                )}
              >
                {collection}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((piece) => (
            <article
              key={`${piece.image}-${piece.title}`}
              className="group overflow-hidden rounded-xl border border-primary/8 bg-card shadow-warm"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-surface-container">
                <Image
                  src={piece.image}
                  alt={piece.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 p-4 lg:translate-y-2 lg:opacity-0 lg:transition-all lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
                  {piece.collection && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-white/75">
                      {piece.collection}
                    </span>
                  )}
                  <h2 className="font-headline text-lg font-semibold text-white">{piece.title}</h2>
                  {piece.subtitle && (
                    <p className="mt-1 text-sm text-white/80">{piece.subtitle}</p>
                  )}
                </div>
              </div>
              <div className="p-4 lg:hidden">
                {piece.collection && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/45">
                    {piece.collection}
                  </p>
                )}
                <h2 className="font-headline text-base font-semibold text-primary">{piece.title}</h2>
                {piece.subtitle && (
                  <p className="mt-1 text-sm text-primary/60">{piece.subtitle}</p>
                )}
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="rounded-xl bg-card p-10 text-center text-sm text-primary/60">
            No pieces in this collection yet.
          </p>
        )}
      </div>
    </div>
  );
}
