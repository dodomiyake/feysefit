"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Project } from "@/lib/mock-data";
import {
  CUSTOMER_REFERENCE_CATEGORY_LABELS,
  MAX_CUSTOMER_REFERENCES,
  createCustomerReferenceId,
  formatReferenceUploadDate,
  readReferenceImageFile,
  type CustomerReferenceCategory,
} from "@/lib/customer-references";
import { useApp } from "@/context/AppContext";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { uploadCustomerReferenceImage } from "@/lib/services/storageService";
import { ImageLightbox, type LightboxImage } from "@/components/ui/ImageLightbox";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";
import { cn } from "@/lib/cn";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

function StyleReferenceThumb({
  url,
  alt,
  onOpen,
}: {
  url: string;
  alt: string;
  onOpen: () => void;
}) {
  const resolvedSrc = useResolvedStorageUrl(url);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      aria-label={`View full image: ${alt}`}
    >
      {resolvedSrc ? (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          className="object-contain p-1"
          sizes="(max-width: 640px) 50vw, 200px"
          unoptimized
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-primary/40">
          Loading…
        </span>
      )}
    </button>
  );
}

interface CustomerStyleReferencesProps {
  project: Project;
  compact?: boolean;
  readOnly?: boolean;
}

const fieldClass =
  "signup-field w-full rounded-lg border px-4 py-3 text-sm text-primary placeholder:text-primary/40 outline-none focus:outline-none";

export function CustomerStyleReferences({
  project,
  compact = false,
  readOnly = false,
}: CustomerStyleReferencesProps) {
  const { addCustomerReference, removeCustomerReference, showToast, authUser } = useApp();
  const useSupabase = isSupabaseEnabled();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<CustomerReferenceCategory>("style");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const references = project.customerReferences ?? [];
  const atLimit = references.length >= MAX_CUSTOMER_REFERENCES;

  const lightboxImages: LightboxImage[] = useMemo(
    () =>
      references.map((reference) => ({
        src: reference.url,
        alt: reference.caption ?? CUSTOMER_REFERENCE_CATEGORY_LABELS[reference.category],
        caption: reference.caption,
      })),
    [references]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (atLimit) {
      showToast(`Maximum ${MAX_CUSTOMER_REFERENCES} references reached`, "error");
      return;
    }

    setUploading(true);
    try {
      let url: string;
      if (useSupabase) {
        if (!authUser?.id) {
          throw new Error("You must be signed in to upload references.");
        }
        url = await uploadCustomerReferenceImage(authUser.id, file, project.id);
      } else {
        url = await readReferenceImageFile(file);
      }
      addCustomerReference(project.id, {
        id: createCustomerReferenceId(),
        url,
        category,
        caption: caption.trim() || undefined,
        uploadedAt: formatReferenceUploadDate(),
      });
      setCaption("");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not upload image. Try a JPG or PNG under 5MB.",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-[#d3c3ba]/20 bg-surface-container shadow-warm",
        compact ? "p-5" : "p-6 lg:p-8"
      )}
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary lg:text-xl">
            Style & Fabric References
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Upload photos so your designer understands the silhouette, details, or fabrics you have in
            mind.
          </p>
        </div>
        <span className="text-xs font-medium text-ink-muted">
          {references.length}/{MAX_CUSTOMER_REFERENCES} uploaded
        </span>
      </div>

      {!compact && !readOnly && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-muted">Reference type</p>
            <div className="flex gap-2">
              {(["style", "fabric"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  className={cn(
                    "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    category === option
                      ? "bg-accent text-white"
                      : "border border-[#d3c3ba]/30 bg-background text-ink-muted hover:text-primary"
                  )}
                >
                  {CUSTOMER_REFERENCE_CATEGORY_LABELS[option]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor={`reference-caption-${project.id}`} className="text-sm font-medium text-ink-muted">
              Note for your designer (optional)
            </label>
            <input
              id={`reference-caption-${project.id}`}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Love this neckline / looking for similar lace"
              className={fieldClass}
            />
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="sr-only"
        onChange={handleFileChange}
      />

      <div className={cn("grid gap-4", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}>
        {!readOnly && (
        <button
          type="button"
          disabled={atLimit || uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#d3c3ba]/50 transition-all hover:border-accent hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          ) : (
            <ImagePlus className="mb-2 h-8 w-8 text-ink-muted/60" strokeWidth={1.5} />
          )}
          <span className="text-xs font-medium text-ink-muted">
            {uploading ? "Uploading..." : "Upload photo"}
          </span>
        </button>
        )}

        {references.map((reference, index) => (
          <div key={reference.id} className="group relative aspect-square overflow-hidden rounded-lg bg-background">
            <StyleReferenceThumb
              url={reference.url}
              alt={reference.caption ?? CUSTOMER_REFERENCE_CATEGORY_LABELS[reference.category]}
              onOpen={() => setLightboxIndex(index)}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                {reference.category}
              </span>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => removeCustomerReference(project.id, reference.id)}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove reference"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}

      {!compact && references.length > 0 && (
        <ul className="mt-6 space-y-3 border-t border-[#d3c3ba]/20 pt-6">
          {references.map((reference) => (
            <li key={`${reference.id}-note`} className="text-sm">
              <span className="font-semibold text-accent">
                {CUSTOMER_REFERENCE_CATEGORY_LABELS[reference.category]}:
              </span>{" "}
              <span className="text-primary/80">
                {reference.caption ?? "No note added"} · {reference.uploadedAt}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
