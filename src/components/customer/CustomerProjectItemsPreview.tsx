import Link from "next/link";
import { Shirt } from "lucide-react";
import type { Project } from "@/lib/mock-data";
import {
  aggregateProjectProgressPercent,
  formatAggregateProgressLabel,
} from "@/lib/project-items";
import { getProjectStatusLabel, getProductionTimelineProgress } from "@/lib/project-delivery";

interface CustomerProjectItemsPreviewProps {
  project: Project;
}

export function CustomerProjectItemsPreview({ project }: CustomerProjectItemsPreviewProps) {
  const items = project.items ?? [];
  if (items.length === 0) return null;

  const progressPercent = aggregateProjectProgressPercent(items);
  const progressLabel = formatAggregateProgressLabel(items);

  return (
    <section className="mb-5 rounded-xl border border-primary/8 bg-card p-5 shadow-sm lg:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-primary">
            Your garments
          </h3>
          <p className="mt-1 text-sm text-primary/60">
            {items.length} {items.length === 1 ? "item" : "items"} in this commission
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-primary/50">Overall</p>
          <p className="text-sm font-semibold text-primary">{progressLabel}</p>
        </div>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-primary/10">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const itemProgress = Math.round(getProductionTimelineProgress(item.status));
          return (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-primary/8 bg-background/60 px-4 py-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-highlight/15 text-accent">
                  <Shirt className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">{item.title}</p>
                  <p className="text-xs text-primary/55">
                    {item.outfitType}
                    {item.deadline ? ` · Due ${item.deadline}` : ""}
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold text-primary">{itemProgress}%</p>
                <p className="text-[11px] text-primary/55">{getProjectStatusLabel(item.status)}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <Link
        href={`/projects/${project.id}`}
        className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
      >
        View full project details
      </Link>
    </section>
  );
}
