"use client";

import Image from "next/image";
import { Headphones, Info } from "lucide-react";
import { MEASUREMENT_GUIDE_IMAGE } from "@/lib/measurement-sections";
import { MeasurementVideoTutorial } from "@/components/measurements/MeasurementVideoTutorial";
import { useApp } from "@/context/AppContext";

const GUIDE_STEPS = [
  {
    num: "01",
    title: "The Tape Rule",
    body: "Keep the tape measure level and snug, but not tight enough to indent the skin.",
  },
  {
    num: "02",
    title: "Neutral Stance",
    body: "Stand straight with your weight evenly distributed on both feet.",
  },
] as const;

export function MeasurementGuideSidebar() {
  const { showToast } = useApp();

  return (
    <aside className="space-y-6">
      <div className="lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-xl border border-[#d3c3ba]/30 bg-surface shadow-sm">
          <div className="border-b border-[#d3c3ba]/30 p-6">
            <h3 className="font-headline text-xl font-semibold text-primary">Measurement Guide</h3>
            <p className="mt-2 text-xs text-ink-muted">Tips for the perfect measurement</p>
          </div>

          <div className="relative aspect-[4/5]">
            <Image
              src={MEASUREMENT_GUIDE_IMAGE}
              alt="Editorial mannequin silhouette with measurement guides"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 400px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="mb-1 flex items-center gap-2">
                <Info className="h-4 w-4 text-highlight" />
                <span className="text-xs font-bold uppercase tracking-wide">Pro Tip</span>
              </div>
              <p className="text-xs leading-relaxed opacity-90">
                Wear lightweight undergarments and stand naturally. Have a second person assist
                for the most accurate shoulder and arm readings.
              </p>
            </div>
          </div>

          <div className="border-t border-[#d3c3ba]/30 p-6">
            <h4 className="text-sm font-semibold text-primary">Basic Measurement Tutorial</h4>
            <p className="mt-1 text-xs text-ink-muted">How to measure yourself at home</p>
            <MeasurementVideoTutorial />
          </div>

          <div className="space-y-4 border-t border-[#d3c3ba]/30 p-6">
            {GUIDE_STEPS.map((step) => (
              <div key={step.num} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-highlight/30">
                  <span className="text-xs font-semibold text-primary">{step.num}</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-primary">{step.title}</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4 rounded-xl border border-highlight/20 bg-highlight/10 p-6">
          <Headphones className="h-9 w-9 shrink-0 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-primary">Need a Virtual Fit session?</p>
            <button
              type="button"
              onClick={() => showToast("Virtual fit booking coming soon")}
              className="mt-1 text-xs font-semibold text-accent hover:underline"
            >
              Book 15min Video Call
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
