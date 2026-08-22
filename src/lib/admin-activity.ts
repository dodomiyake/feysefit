import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import type { UserReport } from "@/lib/admin-reports";
import type { AdminRelationship } from "@/lib/admin-relationships";
import type { UnlinkRequest } from "@/lib/customer-access";
import type { Project } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/relative-time";

export type AdminActivityType =
  | "project"
  | "marketplace"
  | "unlink"
  | "report"
  | "relationship";

export interface AdminActivityItem {
  id: string;
  type: AdminActivityType;
  title: string;
  summary: string;
  href: string;
  timestamp: Date;
}

function parseDisplayDate(value: string): Date {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  const fallback = Date.parse(`${value} 12:00:00 GMT`);
  return Number.isNaN(fallback) ? new Date(0) : new Date(fallback);
}

export function formatAdminActivityTime(date: Date) {
  return formatRelativeTime(date);
}

function formatUnlinkActivitySummary(request: UnlinkRequest) {
  if (request.status === "approved" && request.adminNotes?.toLowerCase().includes("auto-approved")) {
    return `From ${request.designerName} · auto-approved, no active project`;
  }
  if (request.status === "approved") {
    return `From ${request.designerName} · approved`;
  }
  if (request.status === "declined") {
    return `From ${request.designerName} · declined`;
  }
  return `From ${request.designerName} · ${request.status.replace(/_/g, " ")}`;
}

export function buildAdminActivityFeed(input: {
  projects: Project[];
  marketplaceApprovals: MarketplaceApproval[];
  unlinkRequests: UnlinkRequest[];
  userReports: UserReport[];
  relationships?: AdminRelationship[];
  limit?: number;
}): AdminActivityItem[] {
  const items: AdminActivityItem[] = [];

  for (const project of input.projects) {
    const timestamp = parseDisplayDate(project.updatedAt ?? project.lastUpdated ?? "");
    if (timestamp.getTime() <= 0) continue;
    items.push({
      id: `project-${project.id}`,
      type: "project",
      title: project.title,
      summary: `${project.status} · ${project.customerName}${project.designerName ? ` · ${project.designerName}` : ""}`,
      href: `/projects/${project.id}`,
      timestamp,
    });
  }

  for (const approval of input.marketplaceApprovals) {
    if (approval.status !== "pending") continue;
    items.push({
      id: `marketplace-${approval.id}`,
      type: "marketplace",
      title: approval.businessName,
      summary: `Marketplace listing pending review · ${approval.specialty}`,
      href: `/dashboard/admin/marketplace-approvals/${approval.id}`,
      timestamp: parseDisplayDate(approval.submittedAt),
    });
  }

  for (const request of input.unlinkRequests) {
    if (request.status === "none") continue;
    items.push({
      id: `unlink-${request.id}`,
      type: "unlink",
      title: `${request.customerName} → unlink`,
      summary: formatUnlinkActivitySummary(request),
      href: "/dashboard/admin/unlink-requests",
      timestamp: parseDisplayDate(request.submittedAt),
    });
  }

  for (const report of input.userReports) {
    if (report.status !== "open") continue;
    items.push({
      id: `report-${report.id}`,
      type: "report",
      title: report.handle,
      summary: `Reported: ${report.reason} · ${report.priority} priority`,
      href: "/dashboard/admin/reported-users",
      timestamp: parseDisplayDate(report.createdAt ?? ""),
    });
  }

  for (const relationship of input.relationships ?? []) {
    items.push({
      id: `relationship-${relationship.id}`,
      type: "relationship",
      title: `${relationship.customerName} ↔ ${relationship.designerName}`,
      summary: `${relationship.registrationType}${relationship.awaitingDesigner ? " · awaiting designer" : " link"} · ${relationship.projectCount} project${relationship.projectCount === 1 ? "" : "s"}${relationship.isActive || relationship.awaitingDesigner ? "" : " · inactive"}`,
      href: "/dashboard/admin/relationships",
      timestamp: parseDisplayDate(relationship.createdAt),
    });
  }

  return items
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, input.limit ?? 20);
}
