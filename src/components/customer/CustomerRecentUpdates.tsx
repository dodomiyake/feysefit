"use client";

import Image from "next/image";
import Link from "next/link";
import { ImagePlus } from "lucide-react";
import type { Project } from "@/lib/mock-data";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";

const updateMeta = [
  { title: "Fabric Selection", imageKey: 0 },
  { title: "Final Sketch", imageKey: 1 },
] as const;

interface CustomerRecentUpdatesProps {
  project: Project;
  portfolioImages: string[];
}

function UpdateThumb({ src, title }: { src: string; title: string }) {
  const resolvedSrc = useResolvedStorageUrl(src);
  return (
    <div className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-lg bg-card">
      {resolvedSrc ? (
        <Image
          src={resolvedSrc}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 33vw, 200px"
          unoptimized
        />
      ) : null}
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="text-xs font-medium text-white">{title}</p>
      </div>
    </div>
  );
}

export function CustomerRecentUpdates({ project, portfolioImages }: CustomerRecentUpdatesProps) {
  const images = [
    project.referenceImages[0] ?? portfolioImages[0],
    portfolioImages[1] ?? project.referenceImages[0],
  ].filter(Boolean) as string[];

  return (
    <section className="rounded-xl bg-surface-container p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-headline text-xl font-semibold text-primary">Recent Updates</h2>
        <Link href={`/projects/${project.id}`} className="text-sm font-medium text-accent hover:underline">
          View Log
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {updateMeta.map((item, index) =>
          images[index] ? (
            <UpdateThumb key={item.title} src={images[index]} title={item.title} />
          ) : (
            <div
              key={item.title}
              className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-lg bg-card"
            >
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-xs font-medium text-white">{item.title}</p>
              </div>
            </div>
          )
        )}
        <Link
          href={`/projects/${project.id}/references`}
          className="flex aspect-[4/5] flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/20 bg-background transition-colors hover:border-accent/40 hover:bg-card"
        >
          <ImagePlus className="mb-2 h-8 w-8 text-primary/35" />
          <span className="text-xs font-medium text-primary/50">Add Reference</span>
        </Link>
      </div>
    </section>
  );
}
