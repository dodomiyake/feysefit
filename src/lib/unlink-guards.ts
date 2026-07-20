import type { ProjectStatus } from "@/lib/design-tokens";
import { normalizeProjectStatus } from "@/lib/project-delivery";
import type { Project } from "@/lib/mock-data";

/** Statuses that allow a customer–designer unlink to proceed. */
export const UNLINK_ALLOWED_PROJECT_STATUSES = new Set<ProjectStatus>([
  "Completed",
  "Cancelled",
  "Admin Support",
]);

export function isUnlinkBlockingProjectStatus(status: ProjectStatus | string): boolean {
  const normalized = normalizeProjectStatus(status);
  return !UNLINK_ALLOWED_PROJECT_STATUSES.has(normalized);
}

/** DM-only placeholder projects created for messaging — not real commissions. */
export function isMessagingShellProject(
  project: Pick<Project, "title" | "outfitType" | "status">
): boolean {
  return (
    project.outfitType === "General" &&
    project.title.includes("— Messages") &&
    project.status === "Enquiry"
  );
}

export function isUnlinkBlockingProject(
  project: Pick<Project, "title" | "outfitType" | "status">
): boolean {
  if (isMessagingShellProject(project)) return false;
  return isUnlinkBlockingProjectStatus(project.status);
}

export function getUnlinkBlockingProjects<T extends Pick<Project, "title" | "outfitType" | "status">>(
  projects: T[]
): T[] {
  return projects.filter(isUnlinkBlockingProject);
}

export function formatUnlinkBlockingMessage(count: number): string {
  if (count === 1) {
    return "You have 1 active project with your designer. Complete it, cancel it, or ask admin to move it to Admin Support before unlinking.";
  }
  return `You have ${count} active projects with your designer. Complete, cancel, or escalate them to Admin Support before unlinking.`;
}

export function isProjectRelationshipArchived(
  project: Pick<Project, "relationshipArchivedAt">
): boolean {
  return Boolean(project.relationshipArchivedAt);
}

export function isConversationReadOnly(input: {
  relationshipArchivedAt?: string | null;
  linkedDesignerId?: string | null;
}): boolean {
  if (input.relationshipArchivedAt) return true;
  return !input.linkedDesignerId;
}
