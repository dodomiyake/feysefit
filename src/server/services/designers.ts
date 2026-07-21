import type { Designer } from "@/lib/mock-data";
import { prisma } from "@/server/db";
import { parseJsonArray } from "@/server/mappers/json";

function mapDesigner(row: {
  id: string;
  businessName: string;
  designerName: string;
  location: string;
  specialty: string;
  bio: string;
  rating: number;
  reviewCount: number;
  portfolioImages: string;
  coverImage: string;
  profileImage: string;
}): Designer {
  return {
    id: row.id,
    businessName: row.businessName,
    designerName: row.designerName,
    location: row.location,
    specialty: row.specialty,
    bio: row.bio,
    rating: row.rating,
    reviewCount: row.reviewCount,
    portfolioImages: parseJsonArray<string>(row.portfolioImages),
    coverImage: row.coverImage,
    profileImage: row.profileImage,
  };
}

export async function listDesigners() {
  const rows = await prisma.designer.findMany({ orderBy: { designerName: "asc" } });
  return rows.map(mapDesigner);
}

export async function getDesignerById(designerId: string) {
  const row = await prisma.designer.findUnique({ where: { id: designerId } });
  return row ? mapDesigner(row) : null;
}

export async function listLiveMarketplaceDesignerIds() {
  const approvals = await prisma.marketplaceApproval.findMany({
    where: { status: "approved" },
    select: { designerId: true },
  });
  const approvedDesignerIds = Array.from(new Set(approvals.map((row) => row.designerId)));
  if (!approvedDesignerIds.length) return [];

  const rows = await prisma.designer.findMany({
    where: {
      marketplaceLive: true,
      id: { in: approvedDesignerIds },
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function setDesignerMarketplaceLive(designerId: string, live: boolean) {
  await prisma.designer.update({
    where: { id: designerId },
    data: { marketplaceLive: live },
  });
  return listLiveMarketplaceDesignerIds();
}
