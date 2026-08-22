import type { PendingInvite } from "@/lib/mock-data";
import { prisma } from "@/server/db";

function mapInvite(row: {
  id: string;
  name: string;
  email: string;
  projectType: string;
  sentAt: string;
  sentAgo: string;
  status: string;
}): PendingInvite {
  return {
    id: row.id,
    code: row.id,
    name: row.name,
    email: row.email,
    projectType: row.projectType,
    sentAt: row.sentAt,
    sentAgo: row.sentAgo,
    status: row.status as PendingInvite["status"],
  };
}

export async function listInvites(designerId?: string) {
  const rows = await prisma.pendingInvite.findMany({
    where: designerId ? { designerId } : undefined,
    orderBy: { sentAt: "desc" },
  });
  return rows.map(mapInvite);
}

export async function createInvite(input: {
  id: string;
  designerId?: string;
  name: string;
  email: string;
  projectType: string;
  sentAt: string;
  sentAgo: string;
}) {
  const row = await prisma.pendingInvite.create({
    data: {
      ...input,
      designerId: input.designerId ?? "1",
      status: "pending",
    },
  });
  return mapInvite(row);
}

export async function cancelInvite(inviteId: string) {
  await prisma.pendingInvite.delete({ where: { id: inviteId } });
}
