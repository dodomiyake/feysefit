"use client";

import { useCallback, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";

export interface LightboxImage {
  src: string;
  alt: string;
  caption?: string;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

function LightboxPhoto({ src, alt }: { src: string; alt: string }) {
  const resolvedSrc = useResolvedStorageUrl(src);
  if (!resolvedSrc) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className="max-h-[calc(90vh-4rem)] w-auto max-w-full object-contain"
    />
  );
}

export function ImageLightbox({ images, index, onClose, onIndexChange }: ImageLightboxProps) {
  const current = images[index];
  const hasMultiple = images.length > 1;

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + images.length) % images.length);
  }, [images.length, index, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % images.length);
  }, [images.length, index, onIndexChange]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasMultiple) goPrev();
      if (event.key === "ArrowRight" && hasMultiple) goNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [goNext, goPrev, hasMultiple, onClose]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label="Close preview"
      >
        <X className="h-6 w-6" />
      </button>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:left-6"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:right-6"
            aria-label="Next image"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </>
      )}

      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex max-h-[calc(90vh-4rem)] w-full items-center justify-center">
          <LightboxPhoto src={current.src} alt={current.alt} />
        </div>
        {(current.caption || hasMultiple) && (
          <div className="mt-4 max-w-2xl text-center">
            {current.caption && (
              <p className="text-sm leading-relaxed text-white/90">{current.caption}</p>
            )}
            {hasMultiple && (
              <p className="mt-1 text-xs text-white/50">
                {index + 1} of {images.length}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ClickableReferenceImageProps {
  src: string;
  alt: string;
  onClick: () => void;
  className?: string;
  sizes?: string;
  /** Thumbnail fit. Cover fills the frame; contain letterboxes. Default: cover. */
  fit?: "cover" | "contain";
  badge?: ReactNode;
  overlay?: ReactNode;
}

export function ClickableReferenceImage({
  src,
  alt,
  onClick,
  className = "aspect-[3/4]",
  sizes = "(max-width: 1024px) 100vw, 33vw",
  fit = "contain",
  badge,
  overlay,
}: ClickableReferenceImageProps) {
  const resolvedSrc = useResolvedStorageUrl(src);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-xl border border-[#d3c3ba]/20 bg-primary/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
      aria-label={`View full image: ${alt}`}
    >
      {resolvedSrc ? (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          className={`${fit === "cover" ? "object-cover" : "object-contain"} transition-transform duration-200 group-hover:scale-[1.02]`}
          sizes={sizes}
          unoptimized
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-primary/40">
          Loading…
        </span>
      )}
      <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
      <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
        View full
      </span>
      {badge}
      {overlay}
    </button>
  );
}
