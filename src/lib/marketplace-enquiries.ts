export type MarketplaceEnquiryStatus =
  | "pending"
  | "discussing"
  | "accepted"
  | "unlinked"
  | "declined"
  | "cancelled"
  | "expired";

export interface MarketplaceEnquiry {
  id: string;
  designerId: string;
  customerId: string;
  designerName: string;
  customerName: string;
  outfitType: string;
  description: string;
  budget: string | null;
  preferredDeadline: string | null;
  consultationPreference: string | null;
  status: MarketplaceEnquiryStatus;
  designerResponse: string | null;
  projectId: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  customerAgreedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceEnquiryMessage {
  id: string;
  enquiryId: string;
  senderRole: "customer" | "designer";
  senderName: string;
  body: string;
  createdAt: string;
}

export function displayMarketplaceEnquiryStatus(
  enquiry: Pick<MarketplaceEnquiry, "status" | "expiresAt">
): MarketplaceEnquiryStatus {
  if (
    (enquiry.status === "pending" || enquiry.status === "discussing") &&
    Date.parse(enquiry.expiresAt) <= Date.now()
  ) {
    return "expired";
  }
  return enquiry.status;
}

export const marketplaceEnquiryStatusLabel: Record<MarketplaceEnquiryStatus, string> = {
  pending: "Awaiting designer",
  discussing: "In discussion",
  accepted: "Accepted",
  unlinked: "Unlinked",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function marketplaceEnquiryCanBeCancelled(enquiry: MarketplaceEnquiry): boolean {
  const status = displayMarketplaceEnquiryStatus(enquiry);
  return status === "pending" || status === "discussing";
}

export function marketplaceEnquiryCanBeAnswered(enquiry: MarketplaceEnquiry): boolean {
  return displayMarketplaceEnquiryStatus(enquiry) === "pending";
}

export function marketplaceEnquiryCanBeDiscussed(enquiry: MarketplaceEnquiry): boolean {
  return displayMarketplaceEnquiryStatus(enquiry) === "discussing";
}

export function marketplaceEnquiryCanConfirmCustomerAgreement(
  enquiry: MarketplaceEnquiry,
  messages: MarketplaceEnquiryMessage[]
): boolean {
  return (
    displayMarketplaceEnquiryStatus(enquiry) === "discussing" &&
    enquiry.customerAgreedAt === null &&
    messages.some((message) => message.senderRole === "designer")
  );
}

export function marketplaceEnquiryCanBeLinked(enquiry: MarketplaceEnquiry): boolean {
  return (
    displayMarketplaceEnquiryStatus(enquiry) === "discussing" &&
    enquiry.customerAgreedAt !== null
  );
}
