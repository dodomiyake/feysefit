import type { ProjectStatus } from "@/lib/design-tokens";
import {
  getProductionTimelineIndex,
  getProductionTimelineProgress,
  getProjectStatusLabel,
  normalizeProjectStatus,
} from "@/lib/project-delivery";

export interface ProjectItem {
  id: string;
  projectId: string;
  sortOrder: number;
  title: string;
  outfitType: string;
  description?: string;
  status: ProjectStatus;
  deadline: string;
  price: string;
  primaryFabric?: string;
  secondaryMaterial?: string;
  lining?: string;
  referenceImages: string[];
  internalNotes?: string;
  measurements?: Record<string, string>;
  measurementsRequired: boolean;
  measurementNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ProjectItemInput = Omit<
  ProjectItem,
  "id" | "projectId" | "sortOrder" | "status" | "createdAt" | "updatedAt"
> & {
  status?: ProjectStatus;
  sortOrder?: number;
};

export function createEmptyProjectItemDraft(overrides?: Partial<ProjectItemInput>): ProjectItemInput {
  return {
    title: "",
    outfitType: "",
    description: "",
    deadline: "",
    price: "",
    primaryFabric: "",
    secondaryMaterial: "",
    lining: "",
    referenceImages: [],
    internalNotes: "",
    measurementsRequired: false,
    measurementNotes: "",
    ...overrides,
  };
}

/** Slowest garment drives overall project production status. */
export function aggregateProjectStatusFromItems(items: ProjectItem[]): ProjectStatus {
  if (!items.length) return "Enquiry";
  let bottleneck: ProjectStatus = "Enquiry";
  let minIndex = Number.POSITIVE_INFINITY;
  for (const item of items) {
    const normalized = normalizeProjectStatus(item.status);
    const index = getProductionTimelineIndex(normalized);
    if (index < minIndex) {
      minIndex = index;
      bottleneck = normalized;
    }
  }
  if (items.every((item) => normalizeProjectStatus(item.status) === "Completed")) {
    return "Completed";
  }
  return bottleneck;
}

export function aggregateProjectProgressPercent(items: ProjectItem[]): number {
  if (!items.length) return 0;
  const total = items.reduce(
    (sum, item) => sum + getProductionTimelineProgress(item.status),
    0
  );
  return Math.round(total / items.length);
}

export function formatAggregateProgressLabel(items: ProjectItem[]): string {
  if (!items.length) return "No garments yet";
  const percent = aggregateProjectProgressPercent(items);
  const status = aggregateProjectStatusFromItems(items);
  return `${percent}% · ${getProjectStatusLabel(status)}`;
}

export function sumItemPrices(items: ProjectItem[]): string {
  const total = items.reduce((sum, item) => {
    const numeric = Number(String(item.price).replace(/[^\d.]/g, ""));
    return sum + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);
  return total > 0 ? String(total) : "";
}
