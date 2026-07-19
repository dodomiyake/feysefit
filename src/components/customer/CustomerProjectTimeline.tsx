"use client";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/cn";
import { AlertCircle, Check, Package, RotateCcw, Truck, Wrench } from "lucide-react";
import {
  designerProjectStatuses,
  getProjectStatusIndex,
  getProjectTimelineProgress,
} from "@/lib/project-timeline";
import { TIMELINE_SHORT_LABELS } from "@/lib/project-details";
import { getProjectStatusLabel, isAwaitingDeliveryConfirmation } from "@/lib/project-delivery";
import type { ProjectStatus } from "@/lib/design-tokens";
import { formatProjectUpdatedLabel } from "@/lib/relative-time";

interface CustomerProjectTimelineProps {
  projectId: string;
}

function stepIcon(status: ProjectStatus, index: number, currentIndex: number) {
  if (index < currentIndex) {
    return <Check className="h-3.5 w-3.5" strokeWidth={2.5} />;
  }
  if (status === "Ready for Delivery") {
    return <Package className="h-3.5 w-3.5" strokeWidth={2} />;
  }
  if (status === "Delivered" || status === "Awaiting Customer Confirmation") {
    return <Truck className="h-3.5 w-3.5" strokeWidth={2} />;
  }
  if (status === "Issue Reported") {
    return <AlertCircle className="h-3.5 w-3.5" strokeWidth={2} />;
  }
  if (status === "Adjustment Needed") {
    return <Wrench className="h-3.5 w-3.5" strokeWidth={2} />;
  }
  if (status === "Re-delivered") {
    return <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />;
  }
  if (status === "Completed") {
    return <Check className="h-3.5 w-3.5" strokeWidth={2.5} />;
  }
  return <span className="text-[10px] font-semibold sm:text-xs">{index + 1}</span>;
}

export function CustomerProjectTimeline({ projectId }: CustomerProjectTimelineProps) {
  const { projects, projectsReady } = useApp();
  const project = projects.find((p) => p.id === projectId);

  if (!projectsReady || !project) {
    return (
      <section className="mb-5 rounded-xl bg-surface-container p-4 shadow-sm">
        <div className="h-16 animate-pulse rounded-lg bg-primary/5" />
      </section>
    );
  }

  const { status, deadline } = project;
  const currentIndex = getProjectStatusIndex(status);
  const progress = getProjectTimelineProgress(status);
  const latestUpdate = project.customerUpdate?.trim();
  const needsConfirmation = isAwaitingDeliveryConfirmation(status);

  return (
    <section className="mb-5 rounded-xl bg-surface-container p-4 shadow-sm lg:p-5">
      <div className="relative px-1">
        <div className="absolute left-5 right-5 top-5 hidden h-px bg-primary/15 sm:block" aria-hidden />
        <div
          className="absolute left-5 top-5 hidden h-px bg-accent transition-all duration-500 sm:block"
          style={{ width: `calc(${progress}% - 2.5rem)` }}
          aria-hidden
        />
        <ol className="grid grid-cols-2 gap-3 sm:flex sm:justify-between sm:gap-1">
          {designerProjectStatuses.map((step, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <li
                key={step}
                className="relative z-10 flex flex-col items-center gap-1.5 text-center sm:min-w-0 sm:flex-1"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-sm transition-all sm:h-10 sm:w-10",
                    isComplete && "border-accent bg-accent text-white",
                    isCurrent && "border-accent bg-highlight/25 text-accent ring-2 ring-background",
                    isUpcoming && "border-primary/15 bg-primary/5 text-primary/35"
                  )}
                >
                  {stepIcon(step, index, currentIndex)}
                </div>
                <span
                  className={cn(
                    "max-w-[4.75rem] text-[10px] font-medium leading-tight sm:max-w-[5.5rem] sm:text-xs",
                    isCurrent ? "font-bold text-accent" : isComplete ? "text-primary" : "text-primary/45"
                  )}
                >
                  {TIMELINE_SHORT_LABELS[step]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-primary/10 pt-3 text-sm text-primary/60">
        <p>
          Est. delivery:{" "}
          <span className="font-semibold text-primary">{deadline}</span>
        </p>
        <p>
          Stage:{" "}
          <span className="font-semibold text-accent">{getProjectStatusLabel(status)}</span>
        </p>
        <p>
          Updated{" "}
          <span className="font-semibold text-primary">{formatProjectUpdatedLabel(project)}</span>
        </p>
      </div>
      {latestUpdate && (
        <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
            Latest update
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-primary/85">{latestUpdate}</p>
          {needsConfirmation && (
            <p className="mt-2 text-xs font-medium text-accent">
              Confirm receipt in the section above — let your designer know if everything is okay.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
