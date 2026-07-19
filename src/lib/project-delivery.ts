import type { ProjectStatus } from "@/lib/design-tokens";
import {
  LEGACY_DELIVERED_STATUS,
  postDeliveryProjectStatuses,
  productionProjectStatuses,
  projectStatuses,
} from "@/lib/design-tokens";

export { LEGACY_DELIVERED_STATUS, productionProjectStatuses, postDeliveryProjectStatuses };

export type ProductionProjectStatus = (typeof productionProjectStatuses)[number];
export type PostDeliveryProjectStatus = (typeof postDeliveryProjectStatuses)[number];

export const deliveryIssueTypes = [
  { value: "fitting_problem", label: "Fitting problem" },
  { value: "wrong_measurement", label: "Wrong measurement" },
  { value: "wrong_fabric", label: "Wrong fabric" },
  { value: "wrong_design_detail", label: "Wrong design detail" },
  { value: "damaged_item", label: "Damaged item" },
  { value: "missing_item", label: "Missing item" },
  { value: "delivery_issue", label: "Delivery issue" },
  { value: "other", label: "Other concern" },
] as const;

export type DeliveryIssueType = (typeof deliveryIssueTypes)[number]["value"];

export type DeliveryIssueStatus = "open" | "in_progress" | "resolved";

export interface ProjectDeliveryIssue {
  id: string;
  projectId: string;
  /** Raw Supabase project uuid — used when matching legacy project ids. */
  projectUuid?: string;
  customerId: string;
  designerId: string;
  issueType: DeliveryIssueType;
  detail: string;
  status: DeliveryIssueStatus;
  designerResponse?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  projectTitle?: string;
  customerName?: string;
}

export const STATUS_DISPLAY_LABELS: Record<ProjectStatus, string> = {
  Enquiry: "Enquiry",
  "Measurements Needed": "Measurements Needed",
  "Design Confirmed": "Design Confirmed",
  "In Production": "In Production",
  "Ready for Delivery": "Ready for Delivery",
  Delivered: "Delivered — Awaiting Customer Confirmation",
  "Awaiting Customer Confirmation": "Delivered — Awaiting Customer Confirmation",
  Completed: "Completed",
  "Issue Reported": "Issue Reported",
  "Adjustment Needed": "Adjustment Needed",
  "Re-delivered": "Re-delivered — Awaiting Customer Confirmation",
};

/** Shorter labels for dense tables where long pills overflow columns. */
export const STATUS_TABLE_LABELS: Partial<Record<ProjectStatus, string>> = {
  Delivered: "Awaiting confirmation",
  "Awaiting Customer Confirmation": "Awaiting confirmation",
  "Re-delivered": "Re-delivered",
  "Measurements Needed": "Measurements",
  "Design Confirmed": "Design confirmed",
  "In Production": "In production",
  "Ready for Delivery": "Ready",
  "Issue Reported": "Issue reported",
  "Adjustment Needed": "Adjustment",
};

export const DESIGNER_DELIVER_ACTION_STATUS: ProjectStatus = "Awaiting Customer Confirmation";
export const REDELIVERED_STATUS: ProjectStatus = "Re-delivered";

/** Statuses where the client can confirm receipt or report a new issue. */
export const DELIVERY_CONFIRMATION_STATUSES = [
  DESIGNER_DELIVER_ACTION_STATUS,
  REDELIVERED_STATUS,
] as const;

export function normalizeProjectStatus(status: string): ProjectStatus {
  if (status === LEGACY_DELIVERED_STATUS) {
    return DESIGNER_DELIVER_ACTION_STATUS;
  }
  return status as ProjectStatus;
}

export function getProjectStatusLabel(status: ProjectStatus | string): string {
  const normalized = normalizeProjectStatus(status);
  return STATUS_DISPLAY_LABELS[normalized] ?? normalized;
}

export function isAwaitingCustomerConfirmation(status: ProjectStatus | string) {
  const normalized = normalizeProjectStatus(status);
  return normalized === "Awaiting Customer Confirmation";
}

export function isAwaitingDeliveryConfirmation(status: ProjectStatus | string) {
  const normalized = normalizeProjectStatus(status);
  return (
    normalized === "Awaiting Customer Confirmation" || normalized === REDELIVERED_STATUS
  );
}

export function canReportDeliveryIssue(status: ProjectStatus | string) {
  if (status === LEGACY_DELIVERED_STATUS) return true;
  const normalized = normalizeProjectStatus(status);
  return normalized === "Awaiting Customer Confirmation" || normalized === REDELIVERED_STATUS;
}

export function isProjectCompleted(status: ProjectStatus | string) {
  return normalizeProjectStatus(status) === "Completed";
}

export function isPostDeliveryStatus(status: ProjectStatus | string) {
  const normalized = normalizeProjectStatus(status);
  return (
    normalized === "Awaiting Customer Confirmation" ||
    normalized === REDELIVERED_STATUS ||
    normalized === "Completed" ||
    normalized === "Issue Reported" ||
    normalized === "Adjustment Needed"
  );
}

export function isClosedProject(status: ProjectStatus | string) {
  return isProjectCompleted(status);
}

export function isActiveCommission(status: ProjectStatus | string) {
  return !isProjectCompleted(status);
}

export function getIssueStatusForType(issueType: DeliveryIssueType): ProjectStatus {
  switch (issueType) {
    case "fitting_problem":
    case "wrong_measurement":
    case "wrong_fabric":
    case "wrong_design_detail":
      return "Adjustment Needed";
    default:
      return "Issue Reported";
  }
}

/** After re-delivery, any new concern returns the timeline to Issue (not Adjust). */
export function getIssueStatusForDeliveryReport(
  projectStatus: ProjectStatus | string,
  issueType: DeliveryIssueType
): ProjectStatus {
  if (normalizeProjectStatus(projectStatus) === REDELIVERED_STATUS) {
    return "Issue Reported";
  }
  return getIssueStatusForType(issueType);
}

export function getDeliveryIssueLabel(issueType: DeliveryIssueType) {
  return deliveryIssueTypes.find((item) => item.value === issueType)?.label ?? issueType;
}

export function getProductionTimelineIndex(status: ProjectStatus | string): number {
  const normalized = normalizeProjectStatus(status);
  if (isPostDeliveryStatus(normalized)) {
    return productionProjectStatuses.length;
  }
  const index = productionProjectStatuses.indexOf(normalized as ProductionProjectStatus);
  return index >= 0 ? index : 0;
}

export function getProductionTimelineProgress(status: ProjectStatus | string): number {
  const index = getProductionTimelineIndex(status);
  if (index >= productionProjectStatuses.length) return 100;
  return (index / (productionProjectStatuses.length - 1)) * 100;
}

/** Index into the full designer timeline (`projectStatuses` in design-tokens). */
export function getFullTimelineIndex(status: ProjectStatus | string): number {
  const normalized = normalizeProjectStatus(status);
  const index = projectStatuses.indexOf(normalized);
  if (index >= 0) return index;
  const productionIndex = productionProjectStatuses.indexOf(normalized as ProductionProjectStatus);
  return productionIndex >= 0 ? productionIndex : 0;
}

export function getFullTimelineProgress(status: ProjectStatus | string): number {
  const index = getFullTimelineIndex(status);
  return (index / (projectStatuses.length - 1)) * 100;
}

export function getOpenDeliveryIssueForProject(
  issues: ProjectDeliveryIssue[],
  projectId: string
) {
  return issues.find(
    (issue) =>
      (issue.projectId === projectId || issue.projectUuid === projectId) &&
      issue.status !== "resolved"
  );
}
