export type MarketplaceEnquiryStatus =
  | "pending"
  | "accepted"
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
  createdAt: string;
  updatedAt: string;
}

export function displayMarketplaceEnquiryStatus(
  enquiry: Pick<MarketplaceEnquiry, "status" | "expiresAt">
): MarketplaceEnquiryStatus {
  if (enquiry.status === "pending" && Date.parse(enquiry.expiresAt) <= Date.now()) {
    return "expired";
  }
  return enquiry.status;
}

export const marketplaceEnquiryStatusLabel: Record<MarketplaceEnquiryStatus, string> = {
  pending: "Awaiting designer",
  accepted: "Accepted",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function marketplaceEnquiryCanBeCancelled(enquiry: MarketplaceEnquiry): boolean {
  return displayMarketplaceEnquiryStatus(enquiry) === "pending";
}

export function marketplaceEnquiryCanBeAnswered(enquiry: MarketplaceEnquiry): boolean {
  return displayMarketplaceEnquiryStatus(enquiry) === "pending";
}
