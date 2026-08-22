import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/mock-data";
import type { ProjectItemInput } from "@/lib/project-items";
import { resolveCustomerProfileId } from "@/lib/services/customerService";
import { resolveDesignerProfileId } from "@/lib/services/designerService";
import { getProjectById } from "@/lib/services/projectService";

export type LinkedCustomerProjectInput = {
  title: string;
  customerId: string;
  customerName: string;
  outfitType: string;
  deadline: string;
  budget: string;
  description?: string;
  referenceImages?: string[];
  items?: ProjectItemInput[];
};

function normaliseProjectCreateError(message: string) {
  if (/active relationship|linked|relationship/i.test(message)) {
    return "You can only create projects for clients who have an active relationship with your atelier.";
  }
  if (/Designer profile not found|Sign in again/i.test(message)) {
    return message;
  }
  if (/row-level security/i.test(message)) {
    return "Could not create this project. Confirm the client is linked to your designer profile, then try again.";
  }
  return message;
}

export async function createLinkedCustomerProjectForDesigner(
  designerLegacyId: string,
  input: LinkedCustomerProjectInput
): Promise<Project> {
  const designerProfileId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerProfileId) throw new Error("Designer not found");

  const customerProfileId = await resolveCustomerProfileId(input.customerId);
  if (!customerProfileId) throw new Error("Customer not found");

  const supabase = createClient();
  const { data: projectId, error } = await (supabase as any).rpc("create_designer_project", {
    p_designer_id: designerProfileId,
    p_customer_id: customerProfileId,
    p_title: input.title,
    p_customer_name: input.customerName,
    p_outfit_type: input.outfitType,
    p_deadline: input.deadline,
    p_budget: input.budget,
    p_description: input.description?.trim() ?? "",
    p_reference_images: input.referenceImages ?? [],
    p_items: input.items ?? [],
  });

  if (error) {
    throw new Error(normaliseProjectCreateError(error.message));
  }
  if (!projectId) {
    throw new Error("Project was not created. Please try again.");
  }

  const project = await getProjectById(projectId);
  if (!project) {
    throw new Error("Project was created, but could not be loaded. Refresh and check Projects.");
  }
  return project;
}
