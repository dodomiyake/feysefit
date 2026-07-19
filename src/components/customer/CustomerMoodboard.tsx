"use client";

import Image from "next/image";
import { useResolvedStorageUrl } from "@/hooks/useResolvedStorageUrl";

export function CustomerMoodboard({ imageUrl }: { imageUrl: string }) {
  const resolvedSrc = useResolvedStorageUrl(imageUrl);

  return (
    <div className="group relative h-48 overflow-hidden rounded-xl bg-card">
      {resolvedSrc ? (
        <Image
          src={resolvedSrc}
          alt="Project moodboard"
          fill
          className="object-cover"
          sizes="400px"
          unoptimized
        />
      ) : null}
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          className="rounded-full border border-white/40 bg-white/20 px-6 py-2 text-sm font-medium text-white backdrop-blur-md"
        >
          View Moodboard
        </button>
      </div>
    </div>
  );
}
