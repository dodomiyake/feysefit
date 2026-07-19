import type { ProjectStatus } from "@/lib/design-tokens";
import type { CustomerReferenceCategory } from "@/lib/customer-references";

export function formatLastUpdated() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTimelineCustomerUpdate(status: ProjectStatus): string {
  return `Timeline updated: your project is now at "${status}".`;
}

export function formatDesignerDeliveryResponseCustomerUpdate(response: string): string {
  const trimmed = response.trim();
  if (!trimmed) {
    return "Your designer responded to your delivery concern.";
  }
  const preview = trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed;
  return `Your designer responded: "${preview}"`;
}

export function formatDeliveredCustomerUpdate(): string {
  return "Your outfit has been delivered — please confirm receipt when you're ready.";
}

export function formatDeliveryConfirmedCustomerUpdate(): string {
  return "Thank you for confirming — your project is now complete.";
}

export function formatDeliveryConfirmedDesignerUpdate(customerName: string): string {
  return `${customerName} confirmed delivery — project complete.`;
}

export function formatIssueReportedCustomerUpdate(issueLabel: string): string {
  return `You reported a concern (${issueLabel}). Your designer will follow up shortly.`;
}

export function formatIssueReportedAfterRedeliveryCustomerUpdate(issueLabel: string): string {
  return `You reported a new concern after redelivery (${issueLabel}). Your designer will follow up shortly.`;
}

export function formatIssueReportedDesignerUpdate(
  customerName: string,
  issueLabel: string,
  detail?: string
): string {
  const trimmed = detail?.trim();
  if (trimmed) {
    const preview = trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
    return `${customerName} reported: ${issueLabel} — "${preview}"`;
  }
  return `${customerName} reported a delivery concern: ${issueLabel}.`;
}

export function formatIssueReportedAfterRedeliveryDesignerUpdate(
  customerName: string,
  issueLabel: string,
  detail?: string
): string {
  const trimmed = detail?.trim();
  if (trimmed) {
    const preview = trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
    return `${customerName} reported a new issue after redelivery: ${issueLabel} — "${preview}"`;
  }
  return `${customerName} reported a new issue after redelivery: ${issueLabel}.`;
}

export function formatRedeliveredCustomerUpdate(): string {
  return "Your outfit has been redelivered — please confirm receipt when you're ready.";
}

export function formatProgressPhotosCustomerUpdate(): string {
  return "New progress photos shared with you.";
}

export function formatProjectCreatedCustomerUpdate(): string {
  return "Project created — your designer will share updates here.";
}

export function formatMeasurementsUpdatedCustomerUpdate(): string {
  return "Your project measurements were updated by your designer.";
}

export function formatReferenceDesignerUpdate(
  customerName: string,
  category: CustomerReferenceCategory
): string {
  const label = category === "fabric" ? "fabric" : "style";
  return `${customerName} shared a new ${label} reference.`;
}

export function formatMeasurementsSubmittedDesignerUpdate(customerName: string): string {
  return `${customerName} submitted measurements — ready for design review.`;
}

export function formatMeasurementsSubmittedCustomerUpdate(advancedToDesign: boolean): string {
  if (advancedToDesign) {
    return "Measurements received — your project is now in design review.";
  }
  return "Thank you — your measurements were received by your designer.";
}

export function formatNewProjectDesignerUpdate(customerName: string, title: string): string {
  return `New commission with ${customerName}: ${title}.`;
}
