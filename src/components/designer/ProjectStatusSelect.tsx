"use client";

import { useApp } from "@/context/AppContext";
import { designerPipelineStatuses, type ProjectStatus } from "@/lib/design-tokens";
import {
  DESIGNER_DELIVER_ACTION_STATUS,
  getProjectStatusLabel,
  isPostDeliveryStatus,
  REDELIVERED_STATUS,
} from "@/lib/project-delivery";
import { cn } from "@/lib/cn";

interface ProjectStatusSelectProps {
  projectId: string;
  status: ProjectStatus;
  className?: string;
  onUpdated?: (status: ProjectStatus) => void;
}

function optionLabel(status: ProjectStatus) {
  if (status === DESIGNER_DELIVER_ACTION_STATUS) {
    return "Delivered (await client confirmation)";
  }
  if (status === REDELIVERED_STATUS) {
    return "Re-delivered (await client confirmation)";
  }
  return getProjectStatusLabel(status);
}

export function ProjectStatusSelect({
  projectId,
  status,
  className,
  onUpdated,
}: ProjectStatusSelectProps) {
  const { updateProjectStatus } = useApp();

  const options = isPostDeliveryStatus(status)
    ? ([...designerPipelineStatuses, "Issue Reported", "In Production"] as ProjectStatus[])
    : ([...designerPipelineStatuses] as ProjectStatus[]);

  const uniqueOptions = [...new Set(options)];

  return (
    <select
      value={status}
      aria-label="Update project timeline status"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const next = e.target.value as ProjectStatus;
        updateProjectStatus(projectId, next);
        onUpdated?.(next);
      }}
      className={cn(
        "cursor-pointer rounded-full border border-primary/15 bg-background py-1.5 pl-3 pr-8 text-xs font-medium text-primary",
        "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
        className
      )}
    >
      {uniqueOptions.map((step) => (
        <option key={step} value={step}>
          {optionLabel(step)}
        </option>
      ))}
    </select>
  );
}
