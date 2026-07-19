"use client";

import Link from "next/link";
import Image from "next/image";
import type { Project } from "@/lib/mock-data";
import { ImagePlus } from "lucide-react";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";

interface CustomerReferencesPreviewProps {
  project: Project;
}

function PreviewThumb({ url, alt, category }: { url: string; alt: string; category: string }) {
  const resolvedSrc = useResolvedStorageUrl(url);
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-background">
      {resolvedSrc ? (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          className="object-cover"
          sizes="120px"
          unoptimized
        />
      ) : null}
      <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-medium uppercase text-white">
        {category === "fabric" ? "Fabric" : "Style"}
      </span>
    </div>
  );
}

export function CustomerReferencesPreview({ project }: CustomerReferencesPreviewProps) {
  const references = project.customerReferences ?? [];
  const preview = references.slice(0, 3);

  return (
    <div className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-5 shadow-warm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-headline text-base font-semibold text-primary">Your references</h3>
        <Link
          href={`/projects/${project.id}/references`}
          className="text-xs font-semibold text-accent hover:underline"
        >
          Manage
        </Link>
      </div>

      {preview.length === 0 ? (
        <Link
          href={`/projects/${project.id}/references`}
          className="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#d3c3ba]/40 text-ink-muted transition-colors hover:border-accent hover:text-primary"
        >
          <ImagePlus className="mb-2 h-6 w-6" />
          <span className="text-xs font-medium">Add style or fabric photos</span>
        </Link>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {preview.map((reference) => (
            <PreviewThumb
              key={reference.id}
              url={reference.url}
              alt={reference.caption ?? "Reference"}
              category={reference.category}
            />
          ))}
        </div>
      )}

      {references.length > 0 && (
        <p className="mt-3 text-xs text-ink-muted">
          {references.length} reference{references.length === 1 ? "" : "s"} shared with your designer
          {references[0]?.caption
            ? ` · Latest: ${references[references.length - 1].caption}`
            : ""}
        </p>
      )}
    </div>
  );
}
