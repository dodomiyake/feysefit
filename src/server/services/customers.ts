import type { Customer } from "@/lib/mock-data";
import type { CustomerLinkState } from "@/lib/customer-access";
import { prisma } from "@/server/db";

function mapCustomerLink(row: {
  linkedDesignerId: string | null;
  linkedDesigner: { designerName: string } | null;
  hasConcludedProject: boolean;
  unlinkStatus: string;
  unlinkReason: string | null;
  unlinkSubmittedAt: string | null;
  activeUnlinkRequestId: string | null;
  registrationType: string | null;
}): CustomerLinkState {
  return {
    linkedDesignerId: row.linkedDesignerId,
    linkedDesignerName: row.linkedDesigner?.designerName ?? null,
    hasConcludedProject: row.hasConcludedProject,
    unlinkStatus: row.unlinkStatus as CustomerLinkState["unlinkStatus"],
    unlinkReason: row.unlinkReason,
    unlinkSubmittedAt: row.unlinkSubmittedAt,
    activeUnlinkRequestId: row.activeUnlinkRequestId,
    registrationType: row.registrationType as CustomerLinkState["registrationType"],
  };
}

function mapCustomer(row: {
  id: string;
  name: string;
  location: string;
  phone?: string;
  email: string;
  projectCount: number;
}): Customer {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    phone: row.phone ?? "",
    email: row.email,
    projectCount: row.projectCount,
  };
}

export async function listCustomers() {
  const rows = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  return rows.map(mapCustomer);
}

export async function getCustomerLinkState(customerId: string): Promise<CustomerLinkState | null> {
  const row = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { linkedDesigner: true },
  });

  if (!row) return null;

  return mapCustomerLink(row);
}

export async function patchCustomerLink(customerId: string, patch: Partial<CustomerLinkState>) {
  const row = await prisma.customer.update({
    where: { id: customerId },
    data: {
      linkedDesignerId: patch.linkedDesignerId,
      hasConcludedProject: patch.hasConcludedProject,
      unlinkStatus: patch.unlinkStatus,
      unlinkReason: patch.unlinkReason,
      unlinkSubmittedAt: patch.unlinkSubmittedAt,
      activeUnlinkRequestId: patch.activeUnlinkRequestId,
      registrationType: patch.registrationType,
    },
    include: { linkedDesigner: true },
  });

  return mapCustomerLink(row);
}

export async function linkCustomerToDesigner(customerId: string, designerId: string) {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      linkedDesignerId: designerId,
      registrationType: "invited",
      unlinkStatus: "none",
      unlinkReason: null,
      unlinkSubmittedAt: null,
      activeUnlinkRequestId: null,
    },
  });
  return getCustomerLinkState(customerId);
}

export async function initDirectCustomerLink(customerId: string) {
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      linkedDesignerId: null,
      registrationType: "direct",
      unlinkStatus: "none",
      unlinkReason: null,
      unlinkSubmittedAt: null,
      activeUnlinkRequestId: null,
    },
  });
  return getCustomerLinkState(customerId);
}
