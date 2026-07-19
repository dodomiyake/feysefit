import type {
  CustomerMeasurementProfile,
  MeasurementProfileStatus,
  MeasurementUnit,
} from "@/lib/customer-measurements";
import { emptyMeasurementProfile } from "@/lib/customer-measurements";
import type { PreferredFit } from "@/lib/measurement-sections";
import {
  formatLastUpdated,
  formatMeasurementsSubmittedCustomerUpdate,
  formatMeasurementsSubmittedDesignerUpdate,
  formatMeasurementsUpdatedCustomerUpdate,
} from "@/lib/project-updates";
import { prisma } from "@/server/db";
import { mapProject } from "@/server/mappers/project";
import { parseJsonObject, toJson } from "@/server/mappers/json";

function mapProfile(row: {
  customerId: string;
  unit: string;
  preferredFit: string;
  status: string;
  values: string;
  updatedAt: string | null;
}): CustomerMeasurementProfile {
  return {
    customerId: row.customerId,
    unit: row.unit as MeasurementUnit,
    preferredFit: row.preferredFit as PreferredFit,
    status: row.status as MeasurementProfileStatus,
    values: parseJsonObject<Record<string, string>>(row.values) ?? {},
    recordedBy: "customer",
    updatedAt: row.updatedAt ?? undefined,
  };
}

function formatUpdatedAt() {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function getMeasurementProfile(customerId: string): Promise<CustomerMeasurementProfile> {
  const row = await prisma.customerMeasurementProfile.findUnique({
    where: { customerId },
  });
  return row ? mapProfile(row) : emptyMeasurementProfile(customerId);
}

export async function upsertMeasurementProfile(
  customerId: string,
  patch: Partial<Omit<CustomerMeasurementProfile, "customerId">>
) {
  const existing = await getMeasurementProfile(customerId);
  const next: CustomerMeasurementProfile = {
    ...existing,
    ...patch,
    customerId,
    values: patch.values ?? existing.values,
    updatedAt: formatUpdatedAt(),
  };

  const row = await prisma.customerMeasurementProfile.upsert({
    where: { customerId },
    create: {
      customerId,
      unit: next.unit,
      preferredFit: next.preferredFit,
      status: next.status,
      values: toJson(next.values),
      updatedAt: next.updatedAt,
    },
    update: {
      unit: next.unit,
      preferredFit: next.preferredFit,
      status: next.status,
      values: toJson(next.values),
      updatedAt: next.updatedAt,
    },
  });

  if (next.status === "submitted") {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true },
    });
    const customerName = customer?.name ?? "Your client";
    const project = await prisma.project.findFirst({
      where: { customerId, status: { not: "Delivered" } },
      orderBy: { projectCode: "desc" },
      select: { id: true, status: true },
    });
    if (project) {
      const advancedToDesign = project.status === "Measurements Needed";
      await prisma.project.update({
        where: { id: project.id },
        data: {
          measurements: toJson(next.values),
          status: advancedToDesign ? "Design Confirmed" : project.status,
          customerUpdate: formatMeasurementsSubmittedCustomerUpdate(advancedToDesign),
          designerUpdate: formatMeasurementsSubmittedDesignerUpdate(customerName),
          lastUpdated: formatLastUpdated(),
        },
      });
    }
  }

  return mapProfile(row);
}

export async function updateProjectMeasurements(
  projectId: string,
  measurements: Record<string, string>
) {
  const row = await prisma.project.update({
    where: { id: projectId },
    data: {
      measurements: toJson(measurements),
      customerUpdate: formatMeasurementsUpdatedCustomerUpdate(),
      lastUpdated: formatLastUpdated(),
    },
    include: { customerReferences: true },
  });

  return mapProject(row);
}
