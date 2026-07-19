"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { isLocalDemoMode } from "@/lib/config/backend";
import {
  ClickableReferenceImage,
  ImageLightbox,
  type LightboxImage,
} from "@/components/ui/ImageLightbox";

interface ProjectReferenceGalleryProps {
  images: string[];
  title?: string;
  uploadHref?: string;
}

const DEMO_PLACEHOLDER =
  "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80";

export function ProjectReferenceGallery({
  images,
  title = "Reference & Inspiration",
  uploadHref,
}: ProjectReferenceGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const useDemoPlaceholders = images.length === 0 && isLocalDemoMode();
  const displayImages = useDemoPlaceholders
    ? [DEMO_PLACEHOLDER, DEMO_PLACEHOLDER, DEMO_PLACEHOLDER]
    : images;
  const isEmpty = images.length === 0;

  const lightboxImages: LightboxImage[] = useMemo(
    () =>
      displayImages.map((src, index) => ({
        src,
        alt: `Reference image ${index + 1}`,
      })),
    [displayImages]
  );

  if (isEmpty && !useDemoPlaceholders) {
    return (
      <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-6 shadow-warm">
        <h2 className="font-headline text-lg font-semibold text-primary lg:text-xl">{title}</h2>
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/15 bg-background/50 px-6 py-12 text-center">
          <ImagePlus className="h-10 w-10 text-primary/30" strokeWidth={1.5} />
          <p className="mt-4 max-w-sm text-sm text-primary/60">
            No reference images yet. The customer can upload style and fabric inspiration from their
            project page.
          </p>
          {uploadHref && (
            <Link
              href={uploadHref}
              className="mt-4 text-sm font-medium text-accent hover:underline"
            >
              Upload inspiration
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-4 shadow-warm lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-2 lg:mb-6">
          <div>
            <h2 className="font-headline text-lg font-semibold text-primary lg:text-xl">{title}</h2>
            <p className="mt-1 text-xs text-ink-muted">Tap an image to view it full size</p>
          </div>
          {useDemoPlaceholders && (
            <span className="text-xs text-ink-muted">Demo preview imagery</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayImages.map((src, index) => (
            <ClickableReferenceImage
              key={`${src}-${index}`}
              src={src}
              alt={`Reference image ${index + 1}`}
              className="aspect-[3/4]"
              fit="contain"
              sizes="(max-width: 640px) 50vw, 33vw"
              onClick={() => setLightboxIndex(index)}
            />
          ))}
        </div>
      </section>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </>
  );
}
