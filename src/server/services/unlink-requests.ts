import type { UnlinkRequest } from "@/lib/customer-access";
import { prisma } from "@/server/db";

function mapUnlinkRequest(row: {
  id: string;
  customerId: string;
  customerName: string;
  designerId: string;
  designerName: string;
  reason: string;
  submittedAt: string;
  status: string;
  adminNotes: string | null;
  adminContactedAt: string | null;
  designerConfirmation: string | null;
  designerResponse: string | null;
  designerRespondedAt: string | null;
}): UnlinkRequest {
  return {
    id: row.id,
    customerId: row.customerId,
    customerName: row.customerName,
    designerId: row.designerId,
    designerName: row.designerName,
    reason: row.reason,
    submittedAt: row.submittedAt,
    status: row.status as UnlinkRequest["status"],
    adminNotes: row.adminNotes ?? undefined,
    adminContactedAt: row.adminContactedAt ?? undefined,
    designerConfirmation: (row.designerConfirmation as UnlinkRequest["designerConfirmation"]) ?? null,
    designerResponse: row.designerResponse ?? undefined,
    designerRespondedAt: row.designerRespondedAt ?? undefined,
  };
}

export async function listUnlinkRequests() {
  const rows = await prisma.unlinkRequest.findMany({ orderBy: { submittedAt: "desc" } });
  return rows.map(mapUnlinkRequest);
}

export async function createUnlinkRequest(input: Omit<UnlinkRequest, "designerConfirmation"> & {
  designerConfirmation?: UnlinkRequest["designerConfirmation"];
}) {
  const row = await prisma.unlinkRequest.create({
    data: {
      id: input.id,
      customerId: input.customerId,
      customerName: input.customerName,
      designerId: input.designerId,
      designerName: input.designerName,
      reason: input.reason,
      submittedAt: input.submittedAt,
      status: input.status,
      adminNotes: input.adminNotes,
      adminContactedAt: input.adminContactedAt,
      designerConfirmation: input.designerConfirmation ?? null,
      designerResponse: input.designerResponse,
      designerRespondedAt: input.designerRespondedAt,
    },
  });
  return mapUnlinkRequest(row);
}

export async function updateUnlinkRequest(
  requestId: string,
  patch: Partial<UnlinkRequest>
) {
  const row = await prisma.unlinkRequest.update({
    where: { id: requestId },
    data: {
      status: patch.status,
      adminNotes: patch.adminNotes,
      adminContactedAt: patch.adminContactedAt,
      designerConfirmation: patch.designerConfirmation,
      designerResponse: patch.designerResponse,
      designerRespondedAt: patch.designerRespondedAt,
    },
  });
  return mapUnlinkRequest(row);
}
