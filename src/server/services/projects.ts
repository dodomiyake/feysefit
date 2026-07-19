import type { CustomerReference } from "@/lib/customer-references";
import type { ProjectStatus } from "@/lib/design-tokens";
import {
  formatLastUpdated,
  formatMeasurementsSubmittedDesignerUpdate,
  formatReferenceDesignerUpdate,
  formatTimelineCustomerUpdate,
  formatMeasurementsUpdatedCustomerUpdate,
} from "@/lib/project-updates";
import type { SessionPayload } from "@/server/auth";
import { prisma } from "@/server/db";
import { mapProject } from "@/server/mappers/project";
import { toJson } from "@/server/mappers/json";

const projectInclude = {
  customerReferences: true,
  customer: { select: { linkedDesignerId: true } },
} as const;

export async function listProjects(session: SessionPayload) {
  const where =
    session.role === "admin"
      ? {}
      : session.role === "customer"
        ? { customerId: session.customerId ?? "__none__" }
        : session.role === "designer"
          ? {
              designerId: session.designerId ?? "__none__",
              OR: [
                { customerId: null },
                { customer: { linkedDesignerId: session.designerId ?? "__none__" } },
              ],
            }
          : { id: "__none__" };

  const rows = await prisma.project.findMany({
    where,
    include: projectInclude,
    orderBy: { projectCode: "desc" },
  });
  return rows.map(mapProject);
}

export async function getProjectById(projectId: string) {
  const row = await prisma.project.findUnique({
    where: { id: projectId },
    include: projectInclude,
  });
  return row ? mapProject(row) : null;
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const lastUpdated = formatLastUpdated();
  const row = await prisma.project.update({
    where: { id: projectId },
    data: {
      status,
      customerUpdate: formatTimelineCustomerUpdate(status),
      lastUpdated,
    },
    include: projectInclude,
  });
  return mapProject(row);
}

export async function addCustomerReference(projectId: string, reference: CustomerReference) {
  const existing = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { customerName: true },
  });

  await prisma.customerReference.create({
    data: {
      id: reference.id,
      projectId,
      url: reference.url,
      category: reference.category,
      caption: reference.caption,
      uploadedAt: reference.uploadedAt,
    },
  });

  const row = await prisma.project.update({
    where: { id: projectId },
    data: {
      designerUpdate: formatReferenceDesignerUpdate(existing.customerName, reference.category),
      lastUpdated: formatLastUpdated(),
    },
    include: projectInclude,
  });
  return mapProject(row);
}

export async function removeCustomerReference(projectId: string, referenceId: string) {
  await prisma.customerReference.deleteMany({
    where: { id: referenceId, projectId },
  });

  const row = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: projectInclude,
  });
  return mapProject(row);
}

export async function createProject(input: {
  id: string;
  projectCode: string;
  paletteId: string;
  title: string;
  customerName: string;
  customerId?: string;
  designerId?: string;
  outfitType: string;
  deadline: string;
  budget: string;
  status: ProjectStatus;
  customerUpdate: string;
  internalNotes?: string;
}) {
  const row = await prisma.project.create({
    data: {
      ...input,
      designerId: input.designerId ?? "1",
      referenceImages: toJson([]),
      internalNotes: input.internalNotes ?? "",
    },
    include: projectInclude,
  });
  return mapProject(row);
}
