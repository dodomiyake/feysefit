"use client";

import Image from "next/image";
import Link from "next/link";
import type { Designer } from "@/lib/mock-data";
import { getDesignerReviewSummary, getReviewsForDesigner } from "@/lib/designer-reviews";
import { resolveOutfitTypeLabel } from "@/lib/testimonials";
import { getDesignerProfileMeta, type PortfolioPiece } from "@/lib/designer-profile-meta";
import { resolveDesignerYearsExperience } from "@/lib/designer-display";
import { useApp } from "@/context/AppContext";
import { BackButton } from "@/components/ui/BackButton";
import { MapPin, Star, Mail, PenLine, Quote, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { designerMessageThreadHref } from "@/lib/message-links";
import { shouldShowCustomerMarketplaceCTAs } from "@/lib/marketplace-display";
import { AppointmentRequestPanel } from "@/components/marketplace/AppointmentRequestPanel";

interface DesignerProfileViewProps {
  designer: Designer;
}

function PortfolioBento({ pieces }: { pieces: PortfolioPiece[] }) {
  const large = pieces.find((p) => p.layout === "large") ?? pieces[0];
  const tall = pieces.find((p) => p.layout === "tall") ?? pieces[1];
  const small = pieces.filter((p) => p.layout === "small");

  const cell = (
    piece: PortfolioPiece,
    className: string
  ) => (
    <div
      key={piece.title}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-surface-container",
        className
      )}
    >
      <Image
        src={piece.image}
        alt={piece.title}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/55 via-black/10 to-transparent p-4 opacity-100 transition-opacity lg:from-black/20 lg:opacity-0 lg:group-hover:opacity-100">
        {piece.subtitle && (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
            {piece.subtitle}
          </span>
        )}
        <span className="font-headline text-base font-semibold text-white">{piece.title}</span>
      </div>
    </div>
  );

  return (
    <div className="grid h-auto grid-cols-1 gap-4 md:grid-cols-4 md:gap-6 lg:h-[720px]">
      {large && cell(large, "relative min-h-[280px] md:col-span-2 md:row-span-2 md:min-h-0")}
      {tall && cell(tall, "relative min-h-[280px] md:col-span-1 md:row-span-2 md:min-h-0")}
      {small[0] && cell(small[0], "relative min-h-[200px] md:min-h-0")}
      {small[1] && cell(small[1], "relative min-h-[200px] md:min-h-0")}
    </div>
  );
}

function MobilePortfolioGrid({ pieces }: { pieces: PortfolioPiece[] }) {
  const [featured, ...rest] = pieces;

  return (
    <div className="grid grid-cols-2 gap-3">
      {featured && (
        <div className="relative col-span-2 min-h-[220px] overflow-hidden rounded-xl">
          <Image src={featured.image} alt={featured.title} fill className="object-cover" />
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/50 to-transparent p-4">
            {featured.subtitle && (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/75">
                {featured.subtitle}
              </span>
            )}
            <span className="font-headline text-sm font-semibold text-white">{featured.title}</span>
          </div>
        </div>
      )}
      {rest.map((piece) => (
        <div key={piece.title} className="relative min-h-[140px] overflow-hidden rounded-xl">
          <Image src={piece.image} alt={piece.title} fill className="object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent p-3">
            <span className="text-xs font-medium text-white">{piece.title}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DesignerProfileView({ designer }: DesignerProfileViewProps) {
  const { customerLink, role, testimonials } = useApp();
  const showCustomerCTAs = shouldShowCustomerMarketplaceCTAs(role);
  const reviews = getReviewsForDesigner(designer.id, testimonials);
  const reviewSummary = getDesignerReviewSummary(
    designer.id,
    testimonials,
    designer.rating,
    designer.reviewCount
  );
  const meta = getDesignerProfileMeta(designer.id);
  const isLinkedDesigner = customerLink.linkedDesignerId === designer.id;

  const requestHref = `/marketplace/${designer.id}/request`;
  const messageHref = designerMessageThreadHref(designer.id);
  const tags = meta?.specialtyTags ?? [designer.specialty];
  const designsCount = meta?.designsCount ?? designer.reviewCount;
  const yearsExp = resolveDesignerYearsExperience(designer, meta);
  const philosophy = meta?.philosophyQuote ?? designer.bio;
  const signature = meta?.signature ?? designer.designerName.split(" ").map((n) => n[0]).join(". ");
  const portfolio: PortfolioPiece[] =
    meta?.portfolio ??
    designer.portfolioImages.map((image, i) => ({
      image,
      title: `Collection ${i + 1}`,
      layout: (i === 0 ? "large" : i === 1 ? "tall" : "small") as PortfolioPiece["layout"],
    }));

  return (
    <div className="pb-28 lg:pb-28">
      {/* Hero — full bleed, Stitch-style back control on mobile */}
      <section className="relative h-[280px] w-full lg:h-[450px]">
        <Image src={designer.coverImage} alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/10 to-black/20" />
        <BackButton
          href="/marketplace"
          variant="icon"
          className="absolute left-4 top-4 z-10 lg:left-8 lg:top-6"
          ariaLabel="Back to marketplace"
        />
      </section>

      {/* Mobile identity — Stitch mobile: tag, business name, location, CTAs */}
      <section className="px-5 pt-6 lg:hidden">
        <span className="inline-block rounded-full bg-highlight/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
          {tags[0]}
        </span>
        <h1 className="mt-3 font-headline text-2xl font-semibold text-primary">{designer.businessName}</h1>
        <p className="mt-1 flex items-center gap-1 text-sm text-primary/60">
          <MapPin className="h-4 w-4 shrink-0" />
          {designer.location}
        </p>

        <div className="mt-8">
          <h2 className="font-headline text-lg font-semibold text-primary">Philosophy of Fit</h2>
          <p className="mt-3 text-sm leading-relaxed text-primary/70">{philosophy}</p>
        </div>

        {showCustomerCTAs && isLinkedDesigner && customerLink.linkedDesignerName && (
          <p className="mt-6 rounded-lg border border-accent/20 bg-highlight/10 px-4 py-3 text-sm text-primary">
            You are privately linked to {customerLink.linkedDesignerName}.{" "}
            <Link href={messageHref} className="font-medium text-accent hover:underline">
              Open your project chat
            </Link>
          </p>
        )}
      </section>

      {/* Desktop overlay card — Stitch desktop pattern */}
      <section className="relative z-10 mx-auto hidden max-w-7xl px-5 lg:block lg:-mt-32 lg:px-16">
        <div className="rounded-xl border border-primary/10 bg-surface-container p-8 shadow-warm lg:grid lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col items-start text-left lg:col-span-4">
            <div className="-mt-24 mb-6 h-32 w-32 overflow-hidden rounded-full border-4 border-background bg-background p-1 shadow-lg">
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <Image src={designer.profileImage} alt={designer.designerName} fill className="object-cover" />
              </div>
            </div>

            <h1 className="font-headline text-3xl font-semibold italic text-primary">{designer.designerName}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-primary/60">
              <MapPin className="h-4 w-4" />
              {designer.location}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-highlight/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="mt-4 font-headline text-lg font-semibold text-primary">{designer.businessName}</p>

            <div className="mt-6 flex w-full items-center border-y border-primary/10 py-2">
              <div className="flex-1 border-r border-primary/10 py-2 text-center">
                <p className="font-headline text-xl font-semibold text-primary">{designsCount}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/50">Designs</p>
              </div>
              <div className="flex-1 border-r border-primary/10 py-2 text-center">
                <p className="font-headline text-xl font-semibold text-primary">{designer.rating}</p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/50">Rating</p>
              </div>
              <div className="flex-1 py-2 text-center">
                <p className="font-headline text-xl font-semibold text-primary">
                  {yearsExp ?? "—"}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/50">Years Exp.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center lg:col-span-8">
            <h2 className="border-b border-primary/10 pb-2 font-headline text-xl font-semibold text-primary">
              Philosophy of Fit
            </h2>
            <p className="mt-4 text-lg leading-relaxed italic text-primary/70">&ldquo;{philosophy}&rdquo;</p>
            <div className="mt-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-primary/15" />
              <span className="font-headline text-sm italic text-primary/45">{signature}</span>
            </div>

            {showCustomerCTAs && isLinkedDesigner && customerLink.linkedDesignerName && (
              <p className="mt-6 rounded-lg border border-accent/20 bg-highlight/10 px-4 py-3 text-sm text-primary">
                You are privately linked to {customerLink.linkedDesignerName}.{" "}
                <Link href={messageHref} className="font-medium text-accent hover:underline">
                  Open your project chat
                </Link>
              </p>
            )}

            {showCustomerCTAs && (
              <div className="mt-8">
                <AppointmentRequestPanel designer={designer} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="mx-auto mt-10 max-w-7xl px-5 lg:mt-16 lg:px-16">
        <div className="mb-5 flex items-end justify-between gap-4 lg:mb-6">
          <div>
            <h2 className="font-headline text-xl font-semibold text-primary lg:text-2xl lg:italic">
              <span className="lg:hidden">Portfolio</span>
              <span className="hidden lg:inline">Couture Portfolio</span>
            </h2>
            <p className="mt-1 text-sm text-primary/55">
              <span className="lg:hidden">Selected works of bespoke artistry</span>
              <span className="hidden lg:inline">A curated selection of recent bespoke masterpieces</span>
            </p>
          </div>
          <Link
            href={`/marketplace/${designer.id}/portfolio`}
            className="shrink-0 border-b border-primary text-sm font-medium text-primary transition-all hover:pb-1"
          >
            <span className="lg:hidden">View all</span>
            <span className="hidden lg:inline">View All Collections</span>
          </Link>
        </div>

        <div className="lg:hidden">
          <MobilePortfolioGrid pieces={portfolio} />
        </div>
        <div className="hidden lg:block">
          <PortfolioBento pieces={portfolio} />
        </div>
      </section>

      {/* Testimonials */}
      <section className="mt-10 border-y border-primary/10 bg-surface-container py-10 lg:mt-16 lg:py-12">
        <div className="mx-auto max-w-7xl px-5 lg:px-16">
          <div className="mb-8 text-center lg:mb-10">
            <h2 className="font-headline text-xl font-semibold text-primary lg:text-2xl lg:italic">
              <span className="lg:hidden">Client Reviews</span>
              <span className="hidden lg:inline">Testimonials</span>
            </h2>
            <div className="mt-2 flex flex-col items-center gap-1">
              <div className="flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(reviewSummary.average) ? "fill-accent text-accent" : "text-primary/20"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-primary/55">
                {reviewSummary.average > 0 ? reviewSummary.average.toFixed(1) : "—"} ·{" "}
                {reviewSummary.count} review{reviewSummary.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="max-h-[min(70vh,28rem)] overflow-y-auto overscroll-y-contain rounded-xl border border-primary/8 bg-card/40 p-4 sm:p-6 lg:max-h-[32rem]">
            <div className="grid gap-6 sm:grid-cols-2">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="relative overflow-hidden rounded-xl border border-primary/8 bg-card p-6 shadow-warm"
                >
                  <Quote className="absolute -left-2 -top-2 h-20 w-20 text-primary/5" />
                  <p className="relative z-10 text-base italic leading-relaxed text-primary/80">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                  {review.photoUrl && (
                    <div className="relative z-10 mt-4 h-36 w-full overflow-hidden rounded-lg">
                      <Image
                        src={review.photoUrl}
                        alt="Client outfit"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="relative z-10 mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface font-headline text-sm font-semibold text-primary">
                      {review.author.charAt(0)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-primary">{review.author}</p>
                        {review.verified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                            <BadgeCheck className="h-3 w-3" />
                            Verified client
                          </span>
                        )}
                      </div>
                      {review.location && (
                        <p className="text-xs text-primary/50">{review.location}</p>
                      )}
                      {review.outfitType && (
                        <p className="text-xs text-primary/45">
                          {resolveOutfitTypeLabel(review.outfitType)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {reviews.length === 0 && (
              <p className="py-8 text-center text-sm text-primary/50">No testimonials yet.</p>
            )}
          </div>

          <p className="mt-8 text-center font-headline text-lg font-semibold text-primary lg:hidden">
            {reviewSummary.average > 0 ? reviewSummary.average.toFixed(1) : "—"}{" "}
            <span className="text-sm font-normal text-primary/50">
              from {reviewSummary.count} verified review{reviewSummary.count === 1 ? "" : "s"}
            </span>
          </p>
        </div>
      </section>

      {showCustomerCTAs && (
        <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-40 flex justify-center px-4 lg:bottom-8 lg:left-64 lg:right-8">
          <div className="pointer-events-auto flex max-w-3xl items-center gap-6 rounded-full border border-primary/10 bg-background/95 px-6 py-3 shadow-warm backdrop-blur-md">
            <div className="flex items-center -space-x-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-background">
                <Image src={designer.profileImage} alt="" fill className="object-cover" />
              </div>
              {designer.portfolioImages[0] && (
                <div className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-background">
                  <Image src={designer.portfolioImages[0]} alt="" fill className="object-cover" />
                </div>
              )}
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-[10px] font-bold text-white">
                +{Math.min(designer.reviewCount, 12)}
              </div>
            </div>
            <p className="text-sm text-primary/55">Currently available for new commissions</p>
            <div className="h-6 w-px bg-primary/15" />
            <div className="flex items-center gap-3">
              <Link href={messageHref}>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-full border border-primary/15 bg-surface px-6 py-2 text-sm font-medium text-primary hover:bg-surface-container"
                >
                  <Mail className="h-4 w-4" />
                  Message
                </button>
              </Link>
              <Link href={requestHref}>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-2 text-sm font-medium text-white shadow-lg shadow-primary/20 hover:opacity-90"
                >
                  <PenLine className="h-4 w-4" />
                  Request Design
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
