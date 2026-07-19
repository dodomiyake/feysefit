import type { CustomerReference } from "@/lib/customer-references";
import type { ProjectStatus } from "@/lib/design-tokens";
import type { Project, ProjectTeamMember } from "@/lib/mock-data";
import type { CustomerReference as DbCustomerReference, Project as DbProject } from "@prisma/client";
import { parseJsonArray, parseJsonObject } from "@/server/mappers/json";

export function mapCustomerReference(ref: DbCustomerReference): CustomerReference {
  return {
    id: ref.id,
    url: ref.url,
    category: ref.category as CustomerReference["category"],
    caption: ref.caption ?? undefined,
    uploadedAt: ref.uploadedAt,
  };
}

export function mapProject(
  project: DbProject & { customerReferences?: DbCustomerReference[] }
): Project {
  return {
    id: project.id,
    projectCode: project.projectCode,
    paletteId: project.paletteId,
    title: project.title,
    customerName: project.customerName,
    customerId: project.customerId ?? undefined,
    outfitType: project.outfitType,
    deadline: project.deadline,
    budget: project.budget,
    status: project.status as ProjectStatus,
    referenceImages: parseJsonArray<string>(project.referenceImages),
    customerReferences: project.customerReferences?.map(mapCustomerReference),
    customerUpdate: project.customerUpdate,
    designerUpdate: project.designerUpdate || undefined,
    internalNotes: project.internalNotes,
    measurements: parseJsonObject(project.measurements),
    galleryImages: parseJsonArray<string>(project.galleryImages),
    primaryFabric: project.primaryFabric ?? undefined,
    secondaryMaterial: project.secondaryMaterial ?? undefined,
    lining: project.lining ?? undefined,
    startedDate: project.startedDate ?? undefined,
    estimatedDelivery: project.estimatedDelivery ?? undefined,
    measurementFitNote: project.measurementFitNote ?? undefined,
    teamMembers: parseJsonArray<ProjectTeamMember>(project.teamMembers),
    lastUpdated: project.lastUpdated ?? undefined,
  };
}
