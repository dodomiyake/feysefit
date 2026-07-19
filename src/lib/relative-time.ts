import type { Project } from "@/lib/mock-data";

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "Just now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function parseDisplayDate(value: string): Date | null {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  const fallback = Date.parse(`${value} 12:00:00 GMT`);
  return Number.isNaN(fallback) ? null : new Date(fallback);
}

export function parseProjectTimestamp(
  project: Pick<Project, "updatedAt" | "lastUpdated">
): Date | null {
  if (project.updatedAt) {
    const date = new Date(project.updatedAt);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (project.lastUpdated) {
    return parseDisplayDate(project.lastUpdated);
  }
  return null;
}

export function formatProjectUpdatedLabel(
  project: Pick<Project, "updatedAt" | "lastUpdated">
): string {
  const date = parseProjectTimestamp(project);
  if (!date) return "recently";
  return formatRelativeTime(date);
}
