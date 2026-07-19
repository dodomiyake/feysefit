"use client";

import { useMemo, useState } from "react";
import type { Project } from "@/lib/mock-data";
import { CUSTOMER_REFERENCE_CATEGORY_LABELS } from "@/lib/customer-references";
import {
  ClickableReferenceImage,
  ImageLightbox,
  type LightboxImage,
} from "@/components/ui/ImageLightbox";

interface ProjectCustomerReferencesSectionProps {
  project: Project;
}

export function ProjectCustomerReferencesSection({ project }: ProjectCustomerReferencesSectionProps) {
  const references = project.customerReferences ?? [];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const lightboxImages: LightboxImage[] = useMemo(
    () =>
      references.map((reference) => ({
        src: reference.url,
        alt: reference.caption ?? CUSTOMER_REFERENCE_CATEGORY_LABELS[reference.category],
        caption: [
          CUSTOMER_REFERENCE_CATEGORY_LABELS[reference.category],
          reference.caption,
          reference.uploadedAt ? `Uploaded ${reference.uploadedAt}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
    [references]
  );

  return (
    <>
      <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-5 shadow-warm">
        <div className="mb-4">
          <h2 className="font-headline text-lg font-semibold text-primary">
            Client Style & Fabric References
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Inspiration and fabric cues uploaded by {project.customerName}. Tap any image to view
            full size.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {references.map((reference, index) => (
            <article
              key={reference.id}
              className="overflow-hidden rounded-xl border border-[#d3c3ba]/20 bg-background"
            >
              <ClickableReferenceImage
                src={reference.url}
                alt={reference.caption ?? CUSTOMER_REFERENCE_CATEGORY_LABELS[reference.category]}
                className="aspect-[3/4] rounded-none border-0"
                fit="contain"
                onClick={() => setLightboxIndex(index)}
                badge={
                  <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {CUSTOMER_REFERENCE_CATEGORY_LABELS[reference.category]}
                  </span>
                }
              />
              <div className="p-4">
                <p className="text-sm text-primary/85">
                  {reference.caption ?? "No note provided"}
                </p>
                <p className="mt-2 text-xs text-ink-muted">Uploaded {reference.uploadedAt}</p>
              </div>
            </article>
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
