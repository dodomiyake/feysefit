import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { mapProjectItem } from "@/lib/supabase/mappers";
import type { ProjectItem, ProjectItemInput } from "@/lib/project-items";
import {
  aggregateProjectStatusFromItems,
  sumItemPrices,
} from "@/lib/project-items";
import type { ProjectStatus } from "@/lib/design-tokens";
import { formatTimelineCustomerUpdate } from "@/lib/project-updates";
import type { Database } from "@/lib/types/database";

type ProjectItemUpdate = Database["public"]["Tables"]["project_items"]["Update"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

async function resolveProjectUuid(projectKey: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("id")
    .or(legacyOrIdFilter(projectKey))
    .maybeSingle();
  return data?.id ?? null;
}

export async function listProjectItems(projectKey: string): Promise<ProjectItem[]> {
  const projectUuid = await resolveProjectUuid(projectKey);
  if (!projectUuid) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("project_items")
    .select("*")
    .eq("project_id", projectUuid)
    .order("sort_order", { ascending: true });
  if (error) {
    if (/project_items|relation.*does not exist/i.test(error.message)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapProjectItem(row, projectKey));
}

async function syncProjectFromItems(projectUuid: string, projectKey: string) {
  const items = await listProjectItems(projectKey);
  if (!items.length) return;

  const status = aggregateProjectStatusFromItems(items);
  const budget = sumItemPrices(items);
  const primary = items[0];

  const supabase = createClient();
  const patch: ProjectUpdate = {
    status,
    outfit_type: primary.outfitType,
    customer_update: formatTimelineCustomerUpdate(status),
    updated_at: new Date().toISOString(),
  };
  if (budget) patch.budget = budget;
  if (primary.deadline) patch.deadline = primary.deadline;

  const { error } = await supabase.from("projects").update(patch).eq("id", projectUuid);
  if (error) throw new Error(error.message);
}

export async function createProjectItems(
  projectKey: string,
  inputs: ProjectItemInput[]
): Promise<ProjectItem[]> {
  const projectUuid = await resolveProjectUuid(projectKey);
  if (!projectUuid) throw new Error("Project not found");
  if (!inputs.length) return [];

  const supabase = createClient();
  const rows = inputs.map((input, index) => ({
    project_id: projectUuid,
    sort_order: input.sortOrder ?? index,
    title: input.title.trim(),
    outfit_type: input.outfitType,
    description: input.description?.trim() ?? "",
    status: input.status ?? "Enquiry",
    deadline: input.deadline,
    price: input.price,
    primary_fabric: input.primaryFabric ?? "",
    secondary_material: input.secondaryMaterial ?? "",
    lining: input.lining ?? "",
    reference_images: input.referenceImages ?? [],
    internal_notes: input.internalNotes ?? "",
    measurements: input.measurements ?? null,
    measurements_required: input.measurementsRequired ?? false,
    measurement_notes: input.measurementNotes ?? "",
  }));

  const { data, error } = await supabase.from("project_items").insert(rows).select("*");
  if (error) throw new Error(error.message);

  await syncProjectFromItems(projectUuid, projectKey);
  return (data ?? []).map((row) => mapProjectItem(row, projectKey));
}

export async function updateProjectItem(
  itemId: string,
  projectKey: string,
  patch: Partial<ProjectItemInput> & { status?: ProjectStatus }
): Promise<ProjectItem> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("project_items")
    .select("*")
    .or(legacyOrIdFilter(itemId))
    .maybeSingle();
  if (!existing) throw new Error("Garment not found");

  const updates: ProjectItemUpdate = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.outfitType !== undefined) updates.outfit_type = patch.outfitType;
  if (patch.description !== undefined) updates.description = patch.description.trim();
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.deadline !== undefined) updates.deadline = patch.deadline;
  if (patch.price !== undefined) updates.price = patch.price;
  if (patch.primaryFabric !== undefined) updates.primary_fabric = patch.primaryFabric;
  if (patch.secondaryMaterial !== undefined) updates.secondary_material = patch.secondaryMaterial;
  if (patch.lining !== undefined) updates.lining = patch.lining;
  if (patch.referenceImages !== undefined) updates.reference_images = patch.referenceImages;
  if (patch.internalNotes !== undefined) updates.internal_notes = patch.internalNotes;
  if (patch.measurements !== undefined) updates.measurements = patch.measurements;
  if (patch.measurementsRequired !== undefined) {
    updates.measurements_required = patch.measurementsRequired;
  }
  if (patch.measurementNotes !== undefined) updates.measurement_notes = patch.measurementNotes;
  if (patch.sortOrder !== undefined) updates.sort_order = patch.sortOrder;

  const { data, error } = await supabase
    .from("project_items")
    .update(updates)
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await syncProjectFromItems(existing.project_id, projectKey);
  return mapProjectItem(data, projectKey);
}

export async function deleteProjectItem(itemId: string, projectKey: string): Promise<void> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("project_items")
    .select("id, project_id")
    .or(legacyOrIdFilter(itemId))
    .maybeSingle();
  if (!existing) return;

  const { error } = await supabase.from("project_items").delete().eq("id", existing.id);
  if (error) throw new Error(error.message);

  await syncProjectFromItems(existing.project_id, projectKey);
}
