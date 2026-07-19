"use client";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/cn";

export function MeasurementUnitToggle({ className }: { className?: string }) {
  const { measurementUnit, setMeasurementUnit } = useApp();

  return (
    <div
      className={cn(
        "flex shrink-0 items-center rounded-full border border-[#d3c3ba]/30 bg-surface-container p-1 shadow-sm",
        className
      )}
    >
      {(["cm", "inches"] as const).map((unit) => {
        const active = measurementUnit === unit;
        const label = unit === "cm" ? "CM" : "IN";
        return (
          <button
            key={unit}
            type="button"
            onClick={() => setMeasurementUnit(unit)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-all duration-300",
              active
                ? "bg-highlight text-primary"
                : "text-ink-muted hover:text-primary"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
