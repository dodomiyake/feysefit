"use client";

import { useState } from "react";
import { Check, Circle, Package, Truck, AlertCircle, Wrench, RotateCcw, XCircle } from "lucide-react";
import type { Project } from "@/lib/mock-data";
import { ProjectStatusSelect } from "@/components/designer/ProjectStatusSelect";
import { timelineProjectStatuses, type ProjectStatus } from "@/lib/design-tokens";
import { useApp } from "@/context/AppContext";
import {
  getProjectStatusIndex,
} from "@/lib/project-timeline";
import {
  getTimelineProgress,
  TIMELINE_SHORT_LABELS,
  type ResolvedProjectDetails,
} from "@/lib/project-details";
import { formatProjectUpdatedLabel } from "@/lib/relative-time";
import { cn } from "@/lib/cn";

interface ProductionTimelineProps {
  project: Project;
  details: ResolvedProjectDetails;
  isDesigner: boolean;
}

function stepIcon(status: ProjectStatus, index: number, currentIndex: number) {
  if (index < currentIndex) {
    return <Check className="h-4 w-4" strokeWidth={2.5} />;
  }
  if (status === "Ready for Delivery") {
    return <Package className="h-4 w-4" strokeWidth={2} />;
  }
  if (status === "Delivered" || status === "Awaiting Customer Confirmation") {
    return <Truck className="h-4 w-4" strokeWidth={2} />;
  }
  if (status === "Issue Reported") {
    return <AlertCircle className="h-4 w-4" strokeWidth={2} />;
  }
  if (status === "Adjustment Needed") {
    return <Wrench className="h-4 w-4" strokeWidth={2} />;
  }
  if (status === "Re-delivered") {
    return <RotateCcw className="h-4 w-4" strokeWidth={2} />;
  }
  if (status === "Completed") {
    return <Check className="h-4 w-4" strokeWidth={2.5} />;
  }
  if (index === currentIndex) {
    return <Circle className="h-3 w-3 fill-current" />;
  }
  return <Circle className="h-3 w-3" strokeWidth={1.5} />;
}

export function ProductionTimeline({ project, details, isDesigner }: ProductionTimelineProps) {
  const { updateProjectStatus } = useApp();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const currentIndex = getProjectStatusIndex(project.status);
  const progress = getTimelineProgress(project.status);
  const latestUpdate = isDesigner
    ? project.designerUpdate?.trim() || project.customerUpdate?.trim()
    : project.customerUpdate?.trim();
  const updateLabel =
    isDesigner && project.designerUpdate?.trim() ? "Latest client update" : "Latest update";

  return (
    <section className="mb-5 rounded-xl border border-[#d3c3ba]/20 bg-surface-container p-4 shadow-warm lg:mb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-headline text-lg font-semibold text-primary lg:text-xl">
            Production Timeline
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Est. delivery{" "}
            <span className="font-medium text-primary">{details.estimatedDelivery}</span>
            {" · "}
            Updated{" "}
            <span className="font-medium text-primary">{formatProjectUpdatedLabel(project)}</span>
          </p>
        </div>
        {isDesigner && (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-ink-muted">Update status</span>
              <ProjectStatusSelect projectId={project.id} status={project.status} />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!confirmingCancel) {
                  setConfirmingCancel(true);
                  return;
                }
                updateProjectStatus(project.id, "Cancelled");
              }}
              onBlur={() => setConfirmingCancel(false)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                confirmingCancel
                  ? "border-red-500 bg-red-500 text-white hover:bg-red-600"
                  : "border-red-500/25 bg-background text-red-600 hover:bg-red-50"
              )}
            >
              <XCircle className="h-3.5 w-3.5" />
              {confirmingCancel ? "Confirm cancel" : "Cancel project"}
            </button>
          </div>
        )}
      </div>

      <div className="relative px-1">
        <div className="absolute left-5 right-5 top-[1.125rem] hidden h-0.5 bg-primary/10 sm:block">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ol className="grid grid-cols-2 gap-3 sm:flex sm:justify-between sm:gap-1">
          {timelineProjectStatuses.map((status, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <li
                key={status}
                className="flex flex-col items-center gap-1.5 text-center sm:min-w-0 sm:flex-1"
              >
                <div
                  className={cn(
                    "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors sm:h-10 sm:w-10",
                    isComplete && "border-accent bg-accent text-white",
                    isCurrent && "border-accent bg-background text-accent shadow-[0_0_0_3px_rgba(179,134,1,0.15)]",
                    isUpcoming && "border-primary/15 bg-background text-primary/30"
                  )}
                >
                  {stepIcon(status, index, currentIndex)}
                </div>
                <span
                  className={cn(
                    "max-w-[4.75rem] text-[10px] font-medium leading-tight sm:max-w-[5.5rem] sm:text-xs",
                    isCurrent ? "text-primary" : "text-ink-muted"
                  )}
                >
                  {TIMELINE_SHORT_LABELS[status]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {latestUpdate && (
        <div className="mt-4 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
            {updateLabel}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-primary/85">{latestUpdate}</p>
        </div>
      )}
    </section>
  );
}
