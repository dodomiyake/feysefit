import type { ProjectStatus } from "./design-tokens";
import {
  getFullTimelineIndex,
  getFullTimelineProgress,
  getProductionTimelineIndex,
  productionProjectStatuses,
} from "@/lib/project-delivery";
import { projectStatuses as fullProjectStatuses } from "./design-tokens";

export { productionProjectStatuses as projectStatuses };

export function getProjectStatusIndex(status: ProjectStatus): number {
  return getFullTimelineIndex(status);
}

export function getProjectTimelineProgress(status: ProjectStatus): number {
  return getFullTimelineProgress(status);
}

/** Customer-facing timeline (production steps only). */
export function getCustomerProjectStatusIndex(status: ProjectStatus): number {
  return getProductionTimelineIndex(status);
}

export { fullProjectStatuses as designerProjectStatuses };
