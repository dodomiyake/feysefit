export type MarketplaceApprovalStatus = "pending" | "approved" | "declined";

export interface MarketplaceApproval {
  id: string;
  designerId: string;
  designerName: string;
  businessName: string;
  specialty: string;
  submittedAt: string;
  status: MarketplaceApprovalStatus;
  adminNotes?: string;
  declineReason?: string;
}

export const MARKETPLACE_APPROVALS_STORAGE_KEY = "feysefit_marketplace_approvals";
export const MARKETPLACE_LIVE_IDS_STORAGE_KEY = "feysefit_marketplace_live_ids";

/** Designers already listed before admin review flow (demo baseline). */
export const DEFAULT_LIVE_DESIGNER_IDS = ["1", "2"];

export const seedMarketplaceApprovals: MarketplaceApproval[] = [
  {
    id: "ma-1",
    designerId: "3",
    designerName: "Amara Diallo",
    businessName: "Elegance by Amara",
    specialty: "Occasion Wear & Gowns",
    submittedAt: "Jun 28, 2026",
    status: "pending",
  },
  {
    id: "ma-2",
    designerId: "ext-jv",
    designerName: "Julian Vancore",
    businessName: "Vancore Leather",
    specialty: "Luxe Leatherwork • Bespoke",
    submittedAt: "Jun 29, 2026",
    status: "pending",
  },
  {
    id: "ma-3",
    designerId: "ext-er",
    designerName: "Elena Rossi",
    businessName: "Rossi Silk Studio",
    specialty: "Sustainable Silk • Ready-to-Wear",
    submittedAt: "Jun 30, 2026",
    status: "pending",
  },
];

export function getPendingApprovals(approvals: MarketplaceApproval[]) {
  return approvals.filter((a) => a.status === "pending");
}

export function hasPendingApprovalForDesigner(
  approvals: MarketplaceApproval[],
  designerId: string
) {
  return approvals.some((a) => a.designerId === designerId && a.status === "pending");
}

export function isDesignerLive(liveIds: string[], designerId: string) {
  return liveIds.includes(designerId);
}
