"use client";

import type { ProjectStatus } from "@/lib/design-tokens";
import {
  getProjectStatusLabel,
  STATUS_TABLE_LABELS,
} from "@/lib/project-delivery";
import { cn } from "@/lib/cn";

const statusColors: Partial<Record<ProjectStatus, string>> = {
  Enquiry: "bg-primary/10 text-primary",
  "Measurements Needed": "bg-amber-100 text-amber-800",
  "Design Confirmed": "bg-blue-100 text-blue-800",
  "In Production": "bg-purple-100 text-purple-800",
  "Ready for Delivery": "bg-emerald-100 text-emerald-800",
  Delivered: "bg-highlight/20 text-primary",
  "Awaiting Customer Confirmation": "bg-highlight/25 text-primary",
  Completed: "bg-emerald-100 text-emerald-900",
  "Issue Reported": "bg-red-100 text-red-800",
  "Adjustment Needed": "bg-amber-100 text-amber-900",
  "Re-delivered": "bg-sky-100 text-sky-900",
};

export function StatusPill({
  status,
  className,
  compact = false,
}: {
  status: ProjectStatus;
  className?: string;
  /** Use shorter labels that fit table columns. */
  compact?: boolean;
}) {
  const label = compact
    ? (STATUS_TABLE_LABELS[status] ?? getProjectStatusLabel(status))
    : getProjectStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-medium",
        compact ? "whitespace-normal text-left leading-snug" : "whitespace-nowrap",
        statusColors[status] ?? "bg-primary/10 text-primary",
        className
      )}
    >
      {label}
    </span>
  );
}
