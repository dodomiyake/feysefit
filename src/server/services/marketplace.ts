import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import { prisma } from "@/server/db";
import { setDesignerMarketplaceLive } from "@/server/services/designers";

function mapApproval(row: {
  id: string;
  designerId: string;
  designerName: string;
  businessName: string;
  specialty: string;
  submittedAt: string;
  status: string;
  adminNotes: string | null;
  declineReason: string | null;
}): MarketplaceApproval {
  return {
    id: row.id,
    designerId: row.designerId,
    designerName: row.designerName,
    businessName: row.businessName,
    specialty: row.specialty,
    submittedAt: row.submittedAt,
    status: row.status as MarketplaceApproval["status"],
    adminNotes: row.adminNotes ?? undefined,
    declineReason: row.declineReason ?? undefined,
  };
}

export async function listMarketplaceApprovals() {
  const rows = await prisma.marketplaceApproval.findMany({
    orderBy: { submittedAt: "desc" },
  });
  return rows.map(mapApproval);
}

export async function updateMarketplaceApproval(
  approvalId: string,
  patch: Partial<MarketplaceApproval>
) {
  const row = await prisma.marketplaceApproval.update({
    where: { id: approvalId },
    data: {
      status: patch.status,
      adminNotes: patch.adminNotes,
      declineReason: patch.declineReason,
    },
  });

  if (patch.status === "approved") {
    await setDesignerMarketplaceLive(row.designerId, true);
  } else if (patch.status === "declined") {
    await setDesignerMarketplaceLive(row.designerId, false);
  }

  return mapApproval(row);
}

export async function createMarketplaceApproval(input: MarketplaceApproval) {
  const row = await prisma.marketplaceApproval.create({
    data: {
      id: input.id,
      designerId: input.designerId,
      designerName: input.designerName,
      businessName: input.businessName,
      specialty: input.specialty,
      submittedAt: input.submittedAt,
      // Submission never self-approves; only the admin PATCH flow may approve it.
      status: "pending",
      adminNotes: input.adminNotes,
      declineReason: input.declineReason,
    },
  });
  return mapApproval(row);
}
