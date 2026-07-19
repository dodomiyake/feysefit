"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { Project } from "@/lib/mock-data";
import type { ResolvedProjectDetails } from "@/lib/project-details";
import { formatMeasurementKey } from "@/lib/project-details";
import { measurementSections } from "@/lib/measurement-sections";
import { useApp } from "@/context/AppContext";
import { Ruler } from "lucide-react";

interface ProjectMeasurementsCardProps {
  project: Project;
  details: ResolvedProjectDetails;
}

const FIELD_ORDER = measurementSections.flatMap((section) =>
  section.fields.map((field) => field.key)
);

function formatMeasurementValue(value: string) {
  return value.replace(/"/g, "").trim();
}

function getOrderedMeasurementEntries(measurements: Record<string, string>) {
  const orderIndex = new Map(FIELD_ORDER.map((key, index) => [key, index]));

  return Object.entries(measurements)
    .map(([key, value]) => ({
      key,
      label: formatMeasurementKey(key),
      value: formatMeasurementValue(value),
    }))
    .filter((entry) => entry.value.length > 0)
    .sort((a, b) => {
      const aIndex = orderIndex.get(a.key) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = orderIndex.get(b.key) ?? Number.MAX_SAFE_INTEGER;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.label.localeCompare(b.label);
    });
}

export function ProjectMeasurementsCard({ project, details }: ProjectMeasurementsCardProps) {
  const { role } = useApp();
  const entries = useMemo(
    () => (project.measurements ? getOrderedMeasurementEntries(project.measurements) : []),
    [project.measurements]
  );
  const detailedChartHref =
    role === "designer" && project.customerId
      ? `/clients/measurements?customer=${encodeURIComponent(project.customerId)}`
      : role === "admin" && project.customerId
        ? `/dashboard/admin/customers/${encodeURIComponent(project.customerId)}`
        : "/measurements";

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-5 shadow-warm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-headline text-lg font-semibold text-primary">Measurements</h3>
        <Ruler className="h-4 w-4 text-accent" strokeWidth={1.75} />
      </div>

      {entries.length > 0 ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {entries.map(({ key, label, value }) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-2 rounded-md bg-background/50 px-2 py-1.5"
            >
              <dt className="truncate text-xs text-ink-muted">{label}</dt>
              <dd className="shrink-0 text-xs font-semibold tabular-nums text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">Measurements not yet submitted.</p>
      )}

      <p className="mt-3 rounded-lg bg-background/60 px-3 py-2 text-xs leading-snug text-ink-muted">
        <span className="font-semibold text-primary">Fit note:</span> {details.measurementFitNote}
      </p>

      <Link
        href={detailedChartHref}
        className="mt-3 inline-flex text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        View detailed chart
      </Link>
    </section>
  );
}
