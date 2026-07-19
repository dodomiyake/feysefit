import type { Project } from "./mock-data";
import { isLocalDemoMode } from "./config/backend";
import type { ProjectStatus } from "./design-tokens";
import {
  getFullTimelineProgress,
  getProjectStatusLabel,
  productionProjectStatuses,
} from "@/lib/project-delivery";
import { projectMessageThreadHref } from "@/lib/message-links";

export const TIMELINE_SHORT_LABELS: Record<string, string> = {
  Enquiry: "Enquiry",
  "Measurements Needed": "Measurements",
  "Design Confirmed": "Design",
  "In Production": "Production",
  "Ready for Delivery": "Ready",
  Delivered: "Delivered",
  "Awaiting Customer Confirmation": "Confirm",
  Completed: "Complete",
  "Issue Reported": "Issue",
  "Adjustment Needed": "Adjust",
  "Re-delivered": "Redeliver",
};

export { productionProjectStatuses as projectStatuses };

const GALLERY_FALLBACKS = [
  "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDXj4AvnpUwXuoAudjZqJXJ-EABo8ITDwPhntcOXi3Ddj6mRA4Uw4ja8hdH1spNLP_ciWLiidrvMnMvVEnZDzEAuk3jmpfXHdjyL41sx3aTdcIcpeb6SxBPAvZDtqZrVkc1zJOpgHaB77ZlTDzlp9eqNrVE4FNmc0HBdKLLwBQlo3zNbYiZpLsw4UKRYUjmKm2qYl2Wgm99txzwYmqIkQHUkHjX8HWcI4_4vKZTaFECziw-2HvzDguS8Ks0kaOjhsf7PnaiHgD3Ow",
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80",
];

const MEASUREMENT_LABELS: Record<string, string> = {
  chest: "Chest",
  waist: "Waist",
  hips: "Hips",
  height: "Height",
  shoulder: "Shoulder",
  sleeve: "Sleeve",
  inseam: "Inseam",
  neck: "Neck",
};

export interface ResolvedProjectDetails {
  galleryImages: string[];
  primaryFabric: string | null;
  secondaryMaterial: string | null;
  lining: string | null;
  startedDate: string;
  estimatedDelivery: string;
  measurementFitNote: string;
  lastUpdated: string;
  teamMembers: { name: string; avatar: string; role: string }[];
}

export function getProjectGalleryImages(project: Project): string[] {
  if (project.galleryImages && project.galleryImages.length > 0) {
    return project.galleryImages.slice(0, 3);
  }
  if (project.referenceImages?.length) {
    return project.referenceImages.slice(0, 3);
  }
  const customerReferenceUrls = (project.customerReferences ?? [])
    .map((reference) => reference.url)
    .filter(Boolean);
  if (customerReferenceUrls.length > 0) {
    return customerReferenceUrls;
  }
  if (isLocalDemoMode()) {
    return GALLERY_FALLBACKS.slice(0, 3);
  }
  return [];
}

export function formatStartedDateFromIso(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatProjectStartedDate(
  project: Pick<Project, "startedDate" | "createdAt">
): string {
  const explicit = project.startedDate?.trim();
  if (explicit) return explicit;
  if (project.createdAt) return formatStartedDateFromIso(project.createdAt);
  return "—";
}

export function resolveProjectDetails(project: Project): ResolvedProjectDetails {
  return {
    galleryImages: getProjectGalleryImages(project),
    primaryFabric: project.primaryFabric ?? null,
    secondaryMaterial: project.secondaryMaterial ?? null,
    lining: project.lining ?? null,
    startedDate: formatProjectStartedDate(project),
    estimatedDelivery: project.estimatedDelivery ?? project.deadline ?? "—",
    measurementFitNote: project.measurementFitNote ?? "—",
    lastUpdated: project.lastUpdated ?? "—",
    teamMembers: project.teamMembers ?? [],
  };
}

export function getTimelineProgress(status: ProjectStatus): number {
  return getFullTimelineProgress(status);
}

export function formatProjectStatusLabel(status: ProjectStatus): string {
  return getProjectStatusLabel(status);
}

export function formatMeasurementLabel(key: string): string {
  return MEASUREMENT_LABELS[key] ?? key;
}

export function hasProjectDescription(project: Project): boolean {
  return Boolean(project.description?.trim());
}

export function messageThreadHref(projectId: string): string {
  return projectMessageThreadHref(projectId);
}

export function formatMeasurementKey(key: string): string {
  return formatMeasurementLabel(key);
}
