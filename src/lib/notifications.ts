import type { UserRole } from "@/lib/design-tokens";
import type { CustomerLinkState, UnlinkRequest } from "@/lib/customer-access";
import type { Conversation } from "@/lib/conversations";
import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import type { Project } from "@/lib/mock-data";
import type { UserReport } from "@/lib/admin-reports";
import { getOpenReportedUsersCount } from "@/lib/admin-reports";
import { conversationMessageHref } from "@/lib/message-links";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  href: string;
  time: string;
}

function previewMessageBody(text: string, hasAttachments: boolean) {
  const trimmed = text.trim();
  if (trimmed) {
    return trimmed.length > 96 ? `${trimmed.slice(0, 96)}...` : trimmed;
  }
  if (hasAttachments) return "Sent an attachment";
  return "New message";
}

function projectNotificationId(projectId: string, lastUpdated?: string) {
  const stamp = (lastUpdated ?? "initial").replace(/\s+/g, "-").toLowerCase();
  return `project-update-${projectId}-${stamp}`;
}

function designerProjectNotificationId(projectId: string, lastUpdated?: string) {
  const stamp = (lastUpdated ?? "initial").replace(/\s+/g, "-").toLowerCase();
  return `designer-project-${projectId}-${stamp}`;
}

export function buildProjectNotifications(
  projects: Project[],
  customerId?: string | null,
  customerName?: string | null
): AppNotification[] {
  let customerProjects = customerId
    ? projects.filter((project) => project.customerId === customerId)
    : [];

  if (!customerProjects.length && customerName) {
    customerProjects = projects.filter((project) => project.customerName === customerName);
  }

  return customerProjects
    .filter((project) => project.customerUpdate?.trim())
    .map((project) => {
      const body = project.customerUpdate.trim();
      const isAppointmentUpdate =
        body.toLowerCase().includes("appointment") ||
        body.includes("My Designer") ||
        body.toLowerCase().includes("fitting") ||
        body.toLowerCase().includes("measurement");

      return {
        id: projectNotificationId(project.id, project.lastUpdated),
        title: isAppointmentUpdate
          ? `Appointment update · ${project.title}`
          : `Project update · ${project.title}`,
        body,
        href: isAppointmentUpdate ? "/my-designer" : `/projects/${project.id}`,
        time: project.lastUpdated ?? "Recently",
      };
    });
}

export function buildDesignerProjectNotifications(projects: Project[]): AppNotification[] {
  return projects
    .filter((project) => project.designerUpdate?.trim())
    .map((project) => ({
      id: designerProjectNotificationId(project.id, project.lastUpdated),
      title: `Client update · ${project.customerName}`,
      body: project.designerUpdate!.trim(),
      href: `/projects/${project.id}`,
      time: project.lastUpdated ?? "Recently",
    }));
}

export function buildMessageNotifications(
  conversations: Conversation[],
  viewerRole: "designer" | "customer"
): AppNotification[] {
  const notifications: AppNotification[] = [];

  for (const conversation of conversations) {
    const last = conversation.messages[conversation.messages.length - 1];
    if (!last || last.sender === viewerRole) continue;

    notifications.push({
      id: `message-${last.id}`,
      title: `New message from ${last.senderName}`,
      body: previewMessageBody(last.text, Boolean(last.attachments?.length)),
      href: conversationMessageHref(conversation.id),
      time: last.timestamp,
    });
  }

  return notifications;
}

interface BuildNotificationsInput {
  role: UserRole | null;
  customerId?: string | null;
  customerName?: string | null;
  customerLink: CustomerLinkState;
  projects: Project[];
  unlinkRequests: UnlinkRequest[];
  userReports: UserReport[];
  getDesignerPendingConfirmations: () => UnlinkRequest[];
  getPendingMarketplaceApprovals: () => MarketplaceApproval[];
}

export function buildNotifications({
  role,
  customerId,
  customerName,
  customerLink,
  projects,
  unlinkRequests,
  userReports,
  getDesignerPendingConfirmations,
  getPendingMarketplaceApprovals,
}: BuildNotificationsInput): AppNotification[] {
  if (!role) return [];

  if (role === "customer") {
    const items: AppNotification[] = [
      ...buildProjectNotifications(projects, customerId, customerName),
    ];

    if (customerLink.unlinkStatus === "pending") {
      items.push({
        id: "customer-unlink-pending",
        title: "Unlink request received",
        body: "Our admin team is reviewing your marketplace unlink request.",
        href: "/settings",
        time: "Recently",
      });
    }

    if (customerLink.unlinkStatus === "designer_review") {
      items.push({
        id: "customer-unlink-designer-review",
        title: "Designer confirmation in progress",
        body: "Admin is confirming your unlink request with your linked designer.",
        href: "/settings",
        time: "Recently",
      });
    }

    if (customerLink.unlinkStatus === "approved") {
      items.push({
        id: "customer-unlink-approved",
        title: "Marketplace access granted",
        body: "Your unlink request was approved. You can now browse the marketplace.",
        href: "/marketplace",
        time: "Recently",
      });
    }

    if (customerLink.unlinkStatus === "declined") {
      items.push({
        id: "customer-unlink-declined",
        title: "Unlink request declined",
        body: "Your unlink request was not approved. Contact admin via messages for details.",
        href: "/messages",
        time: "Recently",
      });
    }

    return items;
  }

  if (role === "designer") {
    return [
      ...buildDesignerProjectNotifications(projects),
      ...getDesignerPendingConfirmations().map((request) => ({
        id: `designer-unlink-${request.id}`,
        title: "Unlink confirmation needed",
        body: `${request.customerName} requested to unlink. Admin needs your confirmation.`,
        href: "/dashboard/designer#unlink-requests",
        time: "Action required",
      })),
    ];
  }

  if (role === "admin") {
    const items: AppNotification[] = [];

    getPendingMarketplaceApprovals().forEach((approval) => {
      items.push({
        id: `admin-approval-${approval.id}`,
        title: "Marketplace approval pending",
        body: `${approval.businessName} is waiting for marketplace listing review.`,
        href: `/dashboard/admin/marketplace-approvals/${approval.id}`,
        time: "Pending",
      });
    });

    unlinkRequests
      .filter((r) => r.status === "pending" || r.status === "designer_review")
      .forEach((request) => {
        items.push({
          id: `admin-unlink-${request.id}`,
          title:
            request.status === "pending"
              ? "New unlink request"
              : "Unlink awaiting designer reply",
          body: `${request.customerName} ↔ ${request.designerName}: review required.`,
          href: "/dashboard/admin/unlink-requests",
          time: "Pending",
        });
      });

    const openReports = getOpenReportedUsersCount(userReports);
    if (openReports > 0) {
      items.push({
        id: "admin-reported-users",
        title: "Reported users",
        body: `${openReports} open report${openReports === 1 ? "" : "s"} need review.`,
        href: "/dashboard/admin/reported-users",
        time: "Today",
      });
    }

    return items;
  }

  return [];
}

export const NOTIFICATIONS_READ_KEY = "feysefit_read_notification_ids";

export function readStoredNotificationIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(NOTIFICATIONS_READ_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function storeReadNotificationIds(ids: string[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify(ids));
}
