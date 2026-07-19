import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { mapProject } from "@/lib/supabase/mappers";
import type { ProjectLocalOps } from "@/lib/local-customer";
import type { Project } from "@/lib/mock-data";
import { getProjectById } from "@/lib/services/projectService";
import { formatLastUpdated } from "@/lib/project-updates";

export async function updateProjectLocalOps(
  projectId: string,
  patch: ProjectLocalOps
): Promise<Project> {
  if (!isSupabaseEnabled()) {
    const { readProjectsFromStorage, saveProjects } = await import("@/lib/project-storage");
    const projects = readProjectsFromStorage();
    const index = projects.findIndex((project) => project.id === projectId);
    if (index < 0) throw new Error("Project not found");
    projects[index] = {
      ...projects[index],
      ...patch,
      customerUpdate:
        "Your designer updated fitting, delivery, or payment details — see the sections below.",
      updatedAt: new Date().toISOString(),
    };
    saveProjects(projects);
    const project = await getProjectById(projectId);
    if (!project) throw new Error("Project not found");
    return project;
  }

  const supabase = createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("projects")
    .select("id")
    .or(legacyOrIdFilter(projectId))
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!existing) throw new Error("Project not found");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("projects")
    .update({
      ...(patch.studioClientId !== undefined ? { studio_client_id: patch.studioClientId } : {}),
      ...(patch.groupProjectId !== undefined ? { group_project_id: patch.groupProjectId } : {}),
      ...(patch.deliveryMethod !== undefined ? { delivery_method: patch.deliveryMethod } : {}),
      ...(patch.localDeliveryStatus !== undefined
        ? { local_delivery_status: patch.localDeliveryStatus }
        : {}),
      ...(patch.firstFittingAt !== undefined ? { first_fitting_at: patch.firstFittingAt } : {}),
      ...(patch.secondFittingAt !== undefined ? { second_fitting_at: patch.secondFittingAt } : {}),
      ...(patch.finalFittingAt !== undefined ? { final_fitting_at: patch.finalFittingAt } : {}),
      ...(patch.fittingNotes !== undefined ? { fitting_notes: patch.fittingNotes } : {}),
      ...(patch.adjustmentNotes !== undefined ? { adjustment_notes: patch.adjustmentNotes } : {}),
      ...(patch.totalPrice !== undefined ? { total_price: patch.totalPrice } : {}),
      ...(patch.depositPaid !== undefined ? { deposit_paid: patch.depositPaid } : {}),
      ...(patch.paymentMethod !== undefined ? { payment_method: patch.paymentMethod } : {}),
      ...(patch.paymentNotes !== undefined ? { payment_notes: patch.paymentNotes } : {}),
      ...(patch.measurementRecordedBy !== undefined
        ? { measurement_recorded_by: patch.measurementRecordedBy }
        : {}),
      customer_update:
        "Your designer updated fitting, delivery, or payment details — see the sections below.",
      last_updated: formatLastUpdated(),
      updated_at: now,
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapProject(data);
}
