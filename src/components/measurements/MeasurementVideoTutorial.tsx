"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import {
  MEASUREMENT_GUIDE_IMAGE,
  MEASUREMENT_TUTORIAL_YOUTUBE_ID,
} from "@/lib/measurement-sections";

export function MeasurementVideoTutorial() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="mt-4">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-[#d3c3ba]/30 bg-primary/5">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${MEASUREMENT_TUTORIAL_YOUTUBE_ID}?autoplay=1&rel=0`}
            title="Basic measurement tutorial — bust, waist, hip, and inseam"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <>
            <Image
              src={MEASUREMENT_GUIDE_IMAGE}
              alt=""
              fill
              className="object-cover opacity-90"
              sizes="400px"
            />
            <div className="absolute inset-0 bg-primary/30" />
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white transition-colors hover:bg-primary/10"
              aria-label="Play basic measurement tutorial"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-primary shadow-md transition-transform hover:scale-105">
                <Play className="ml-1 h-6 w-6 fill-primary text-primary" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide">Play tutorial</span>
            </button>
          </>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
        Covers bust, waist, hip, and inseam — the foundations for most bespoke garments.
      </p>
    </div>
  );
}
