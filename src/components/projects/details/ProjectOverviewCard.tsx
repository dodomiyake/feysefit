import type { Project } from "@/lib/mock-data";
import type { ResolvedProjectDetails } from "@/lib/project-details";
import { cn } from "@/lib/cn";
import { Calendar, PoundSterling, Shirt } from "lucide-react";

interface ProjectOverviewCardProps {
  project: Project;
  details: ResolvedProjectDetails;
  variant?: "default" | "sidebar";
}

export function ProjectOverviewCard({
  project,
  details,
  variant = "default",
}: ProjectOverviewCardProps) {
  const rows = [
    { icon: Shirt, label: "Outfit type", value: project.outfitType },
    { icon: Calendar, label: "Started", value: details.startedDate },
    { icon: PoundSterling, label: "Budget", value: project.budget },
  ];

  return (
    <section className="rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-5 shadow-warm">
      <h3 className="font-headline text-lg font-semibold text-primary">Project Overview</h3>
      <dl
        className={cn(
          "mt-4 grid gap-3",
          variant === "sidebar" ? "grid-cols-1" : "sm:grid-cols-2"
        )}
      >
        {rows.map((row) => (
          <div key={row.label} className="flex gap-2.5 rounded-lg bg-background/40 px-3 py-2">
            <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
            <div className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-primary">{row.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
