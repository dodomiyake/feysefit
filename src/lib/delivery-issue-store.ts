import type { ProjectDeliveryIssue } from "@/lib/project-delivery";

const STORAGE_KEY = "feysefit_delivery_issues";

export function readDeliveryIssuesFromStorage(): ProjectDeliveryIssue[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectDeliveryIssue[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeDeliveryIssuesToStorage(issues: ProjectDeliveryIssue[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
  } catch {
    // ignore
  }
}
