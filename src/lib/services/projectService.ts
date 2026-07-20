import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { mapProject } from "@/lib/supabase/mappers";
import type { ProjectStatus } from "@/lib/design-tokens";
import type { CustomerReference } from "@/lib/customer-references";
import type { Project } from "@/lib/mock-data";
import {
  formatLastUpdated,
  formatProgressPhotosCustomerUpdate,
  formatProjectCreatedCustomerUpdate,
  formatReferenceDesignerUpdate,
  formatTimelineCustomerUpdate,
} from "@/lib/project-updates";
import { formatStartedDateFromIso } from "@/lib/project-details";
import { resolveDesignerProfileId } from "@/lib/services/designerService";
import { resolveCustomerProfileId } from "@/lib/services/customerService";
import {
  canReportDeliveryIssue,
  DESIGNER_DELIVER_ACTION_STATUS,
  LEGACY_DELIVERED_STATUS,
  REDELIVERED_STATUS,
} from "@/lib/project-delivery";
import { markProjectDelivered, redeliverProject } from "@/lib/services/deliveryService";

import type { DbCustomerReference, DbProject } from "@/lib/types/database";

type DesignerMeta = {
  id: string;
  legacy_id: string | null;
  business_name: string;
  designer_name: string;
};

type CustomerMeta = {
  id: string;
  legacy_id: string | null;
};

async function fetchDesignerMetaByProfileIds(
  designerProfileIds: string[]
): Promise<Map<string, DesignerMeta>> {
  if (!designerProfileIds.length) return new Map();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("designer_profiles")
    .select("id, legacy_id, business_name, designer_name")
    .in("id", designerProfileIds);
  if (error) throw new Error(error.message);

  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function fetchCustomerMetaByProfileIds(
  customerProfileIds: string[]
): Promise<Map<string, CustomerMeta>> {
  if (!customerProfileIds.length) return new Map();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("id, legacy_id")
    .in("id", customerProfileIds);
  if (error) throw new Error(error.message);

  return new Map((data ?? []).map((row) => [row.id, row]));
}

async function fetchProjectRows(): Promise<
  Array<{
    project: DbProject;
    references: DbCustomerReference[];
    designer: DesignerMeta | null;
    customer: CustomerMeta | null;
  }>
> {
  const supabase = createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const projectIds = (projects ?? []).map((project) => project.id);
  if (!projectIds.length) return [];

  const designerMeta = await fetchDesignerMetaByProfileIds([
    ...new Set((projects ?? []).map((project) => project.designer_id)),
  ]);

  const customerMeta = await fetchCustomerMetaByProfileIds([
    ...new Set(
      (projects ?? [])
        .map((project) => project.customer_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]);

  const { data: references, error: referencesError } = await supabase
    .from("customer_references")
    .select("*")
    .in("project_id", projectIds);
  if (referencesError) throw new Error(referencesError.message);

  return (projects ?? []).map((project) => ({
    project,
    references: (references ?? []).filter((reference) => reference.project_id === project.id),
    designer: designerMeta.get(project.designer_id) ?? null,
    customer: project.customer_id ? customerMeta.get(project.customer_id) ?? null : null,
  }));
}

async function fetchProjectRow(projectId: string) {
  const supabase = createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .or(legacyOrIdFilter(projectId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) return null;

  const { data: references, error: referencesError } = await supabase
    .from("customer_references")
    .select("*")
    .eq("project_id", project.id);
  if (referencesError) throw new Error(referencesError.message);

  return { project, references: references ?? [], designer: null, customer: null };
}

async function applyCustomerProjectDesignerUpdateRpc(
  designerUpdateMessage: string,
  projectKey?: string | null
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("apply_customer_project_designer_update", {
    designer_update_message: designerUpdateMessage,
    project_key: projectKey ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function notifyDesignerOnCustomerActivity(
  customerId: string,
  designerUpdate: string
) {
  const profileId = await resolveCustomerProfileId(customerId);
  if (!profileId) return;

  await applyCustomerProjectDesignerUpdateRpc(designerUpdate);
}

export async function applyMeasurementSubmissionToProject(
  customerLegacyId: string,
  customerName: string,
  values: Record<string, string>
) {
  const profileId = await resolveCustomerProfileId(customerLegacyId);
  if (!profileId) {
    throw new Error("Customer profile not found");
  }

  const supabase = createClient();
  const { data: projectId, error } = await supabase.rpc("apply_customer_measurement_submission", {
    measurement_values: values,
    customer_display_name: customerName,
  });
  if (error) throw new Error(error.message);
  if (!projectId) {
    throw new Error("No active project found — ask your designer to create one first.");
  }
}

export async function listProjects(): Promise<Project[]> {
  const rows = await fetchProjectRows();
  return rows.map(({ project, references, designer, customer }) =>
    mapProject(project, references, designer, customer)
  );
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const row = await fetchProjectRow(projectId);
  if (!row) return null;

  let designer: DesignerMeta | null = row.designer;
  if (!designer && row.project.designer_id) {
    const meta = await fetchDesignerMetaByProfileIds([row.project.designer_id]);
    designer = meta.get(row.project.designer_id) ?? null;
  }

  let customer: CustomerMeta | null = row.customer ?? null;
  if (!customer && row.project.customer_id) {
    const meta = await fetchCustomerMetaByProfileIds([row.project.customer_id]);
    customer = meta.get(row.project.customer_id) ?? null;
  }

  return mapProject(row.project, row.references, designer, customer);
}

export async function createProject(
  input: {
    title: string;
    customerId?: string;
    customerName: string;
    outfitType: string;
    deadline: string;
    budget: string;
    designerProfileId: string;
    studioClientId?: string;
    description?: string;
    referenceImages?: string[];
    internalNotes?: string;
    customerUpdate?: string;
    measurements?: Record<string, string>;
    measurementRecordedBy?: "customer" | "designer";
  },
  options?: {
    /** Marketplace enquiries are customer-authored; skip designer anti-poach preflight. */
    skipActiveLinkCheck?: boolean;
  }
) {
  const supabase = createClient();
  const customerProfileId = input.customerId
    ? await resolveCustomerProfileId(input.customerId)
    : null;

  let studioClientUuid: string | null = null;
  if (input.studioClientId) {
    const { data: studioRow } = await supabase
      .from("studio_clients")
      .select("id")
      .or(legacyOrIdFilter(input.studioClientId))
      .maybeSingle();
    studioClientUuid = studioRow?.id ?? null;
  }

  // Only designers creating for a platform client need a preflight link check.
  // Never run this for marketplace customer requests — it blocks all clients.
  if (!options?.skipActiveLinkCheck && customerProfileId && !studioClientUuid) {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const { data: designerRow } = await supabase
        .from("designer_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (designerRow?.id) {
        const { data: relationship } = await supabase
          .from("designer_customer_relationships")
          .select("id")
          .eq("designer_id", designerRow.id)
          .eq("customer_id", customerProfileId)
          .eq("is_active", true)
          .maybeSingle();
        if (!relationship) {
          throw new Error(
            "You can only create projects for clients linked to you. This client may be linked to another designer."
          );
        }
      }
    }
  }

  const code = `FF-${Date.now().toString().slice(-6)}`;
  const lastUpdated = formatLastUpdated();
  const now = new Date().toISOString();
  const startedDate = formatStartedDateFromIso(now);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      project_code: code,
      title: input.title,
      customer_name: input.customerName,
      customer_id: customerProfileId,
      studio_client_id: studioClientUuid,
      designer_id: input.designerProfileId,
      outfit_type: input.outfitType,
      deadline: input.deadline,
      budget: input.budget,
      description: input.description?.trim() ?? "",
      status: "Enquiry",
      reference_images: input.referenceImages ?? [],
      internal_notes: input.internalNotes ?? "",
      measurements: input.measurements ?? null,
      measurement_recorded_by: input.measurementRecordedBy ?? null,
      customer_update: input.customerUpdate ?? formatProjectCreatedCustomerUpdate(),
      started_date: startedDate,
      last_updated: lastUpdated,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) {
    if (/row-level security/i.test(error.message)) {
      if (options?.skipActiveLinkCheck) {
        throw new Error(
          "Could not submit this marketplace request. Confirm the designer is live, then try again."
        );
      }
      throw new Error(
        "You can only create projects for clients linked to you. This client may be linked to another designer."
      );
    }
    throw new Error(error.message);
  }
  return mapProject(data, []);
}

export async function createProjectForStudioClient(
  designerLegacyId: string,
  studioClientLegacyId: string,
  input: Omit<
    Parameters<typeof createProject>[0],
    "designerProfileId" | "customerId" | "customerName" | "studioClientId"
  >
) {
  const { getStudioClientById } = await import("@/lib/services/studioClientService");
  const client = await getStudioClientById(designerLegacyId, studioClientLegacyId);
  if (!client) throw new Error("Studio client not found");

  const designerProfileId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerProfileId) throw new Error("Designer not found");

  const hasMeasurements = Object.values(client.measurementValues).some((v) => v.trim());
  const { isSupabaseEnabled } = await import("@/lib/config/backend");

  if (!isSupabaseEnabled()) {
    const { readProjectsFromStorage, saveProjects } = await import("@/lib/project-storage");
    const code = `FF-${Date.now().toString().slice(-6)}`;
    const legacyId = `p-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const project: import("@/lib/mock-data").Project = {
      id: legacyId,
      projectCode: code,
      paletteId: "default",
      title: input.title,
      customerName: client.name,
      studioClientId: client.id,
      outfitType: input.outfitType,
      deadline: input.deadline,
      budget: input.budget,
      status: "Enquiry",
      referenceImages: input.referenceImages ?? [],
      customerUpdate: "Your designer started a new commission for you.",
      internalNotes: input.internalNotes ?? "",
      description: input.description,
      measurements: hasMeasurements ? client.measurementValues : undefined,
      measurementRecordedBy: client.measurementRecordedBy,
      designerId: designerLegacyId,
      startedDate: formatStartedDateFromIso(now),
      createdAt: now,
      updatedAt: now,
    };
    const projects = readProjectsFromStorage();
    saveProjects([project, ...projects]);
    return project;
  }

  return createProject({
    ...input,
    designerProfileId,
    customerName: client.name,
    studioClientId: studioClientLegacyId,
    measurements: hasMeasurements ? client.measurementValues : undefined,
    measurementRecordedBy: hasMeasurements ? client.measurementRecordedBy : undefined,
    customerUpdate: `Walk-in commission started for ${client.name}.`,
  });
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  if (status === LEGACY_DELIVERED_STATUS || status === DESIGNER_DELIVER_ACTION_STATUS) {
    return markProjectDelivered(projectId);
  }
  if (status === REDELIVERED_STATUS) {
    return redeliverProject(projectId);
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .or(legacyOrIdFilter(projectId))
    .maybeSingle();
  if (!existing) throw new Error("Project not found");

  const lastUpdated = formatLastUpdated();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("projects")
    .update({
      status,
      customer_update: formatTimelineCustomerUpdate(status),
      designer_update: "",
      last_updated: lastUpdated,
      updated_at: now,
    })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);

  const { data: deliveredProject } = await supabase
    .from("projects")
    .select("customer_id")
    .eq("id", existing.id)
    .maybeSingle();
  if (status === "Completed" && deliveredProject?.customer_id) {
    const { error: concludedError } = await supabase.rpc("mark_customer_project_concluded", {
      p_customer_id: deliveredProject.customer_id,
    });
    if (concludedError) throw new Error(concludedError.message);
  }

  const updated = await fetchProjectRow(projectId);
  if (!updated) throw new Error("Project not found");

  let designer: DesignerMeta | null = null;
  if (updated.project.designer_id) {
    const meta = await fetchDesignerMetaByProfileIds([updated.project.designer_id]);
    designer = meta.get(updated.project.designer_id) ?? null;
  }
  let customer: CustomerMeta | null = null;
  if (updated.project.customer_id) {
    const meta = await fetchCustomerMetaByProfileIds([updated.project.customer_id]);
    customer = meta.get(updated.project.customer_id) ?? null;
  }

  return mapProject(updated.project, updated.references, designer, customer);
}

export async function appendProjectGalleryImage(projectId: string, imageUrl: string) {
  const supabase = createClient();
  const row = await fetchProjectRow(projectId);
  if (!row) throw new Error("Project not found");

  const gallery = Array.isArray(row.project.gallery_images)
    ? (row.project.gallery_images as string[])
    : [];

  const { error } = await supabase
    .from("projects")
    .update({
      gallery_images: [...gallery, imageUrl],
      customer_update: formatProgressPhotosCustomerUpdate(),
      last_updated: formatLastUpdated(),
    })
    .eq("id", row.project.id);
  if (error) throw new Error(error.message);

  return getProjectById(projectId);
}

export async function addCustomerReference(projectId: string, reference: CustomerReference) {
  const supabase = createClient();
  const row = await fetchProjectRow(projectId);
  if (!row) throw new Error("Project not found");

  const { error } = await supabase.from("customer_references").insert({
    legacy_id: reference.id,
    project_id: row.project.id,
    url: reference.url,
    category: reference.category,
    caption: reference.caption,
    uploaded_at: reference.uploadedAt,
  });
  if (error) throw new Error(error.message);

  await applyCustomerProjectDesignerUpdateRpc(
    formatReferenceDesignerUpdate(row.project.customer_name, reference.category),
    projectId
  );

  return getProjectById(projectId);
}

export async function removeCustomerReference(projectId: string, referenceId: string) {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("projects")
    .select("id")
    .or(legacyOrIdFilter(projectId))
    .maybeSingle();
  if (!row) throw new Error("Project not found");

  const { error } = await supabase
    .from("customer_references")
    .delete()
    .eq("project_id", row.id)
    .or(legacyOrIdFilter(referenceId));
  if (error) throw new Error(error.message);
  return getProjectById(projectId);
}

export async function createProjectForDesignerLegacyId(
  designerLegacyId: string,
  input: Omit<Parameters<typeof createProject>[0], "designerProfileId">,
  options?: Parameters<typeof createProject>[1]
) {
  const designerProfileId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerProfileId) throw new Error("Designer not found");
  return createProject({ ...input, designerProfileId }, options);
}

export async function updateCustomerFabricSelection(
  projectId: string,
  input: {
    primaryFabric: string;
    secondaryMaterial: string;
    lining: string;
  }
) {
  const { isSupabaseEnabled } = await import("@/lib/config/backend");
  const { updateProjectFabricsInStore } = await import("@/lib/project-storage");

  if (!isSupabaseEnabled()) {
    updateProjectFabricsInStore(projectId, {
      primaryFabric: input.primaryFabric,
      secondaryMaterial: input.secondaryMaterial,
      lining: input.lining,
      customerUpdate: "Fabric selections saved — your designer will review and advise.",
      designerUpdate: "Client updated fabric selections.",
    });
    const project = await getProjectById(projectId);
    if (!project) throw new Error("Project not found");
    return project;
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("update_customer_fabric_selection", {
    project_key: projectId,
    primary_fabric: input.primaryFabric,
    secondary_material: input.secondaryMaterial,
    lining: input.lining,
  });
  if (error) throw new Error(error.message);

  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");
  return project;
}

export async function updateDesignerFabricAdvice(projectId: string, advice: string) {
  const { isSupabaseEnabled } = await import("@/lib/config/backend");
  const { updateProjectFabricsInStore } = await import("@/lib/project-storage");

  const trimmed = advice.trim();
  if (!isSupabaseEnabled()) {
    updateProjectFabricsInStore(projectId, {
      designerFabricAdvice: trimmed,
      customerUpdate: trimmed
        ? "Your designer shared fabric advice — review their notes below."
        : undefined,
    });
    const project = await getProjectById(projectId);
    if (!project) throw new Error("Project not found");
    return project;
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .or(legacyOrIdFilter(projectId))
    .maybeSingle();
  if (!existing) throw new Error("Project not found");

  const lastUpdated = formatLastUpdated();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("projects")
    .update({
      designer_fabric_advice: trimmed,
      ...(trimmed
        ? {
            customer_update: "Your designer shared fabric advice — review their notes below.",
            last_updated: lastUpdated,
            updated_at: now,
          }
        : {}),
    })
    .eq("id", existing.id);
  if (error) throw new Error(error.message);

  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");
  return project;
}
