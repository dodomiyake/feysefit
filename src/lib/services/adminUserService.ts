import { createClient } from "@/lib/supabase/client";
import { mapProject } from "@/lib/supabase/mappers";
import type { CustomerLinkState } from "@/lib/customer-access";
import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import type { Customer, Designer, Project } from "@/lib/mock-data";
import type { DbProject } from "@/lib/types/database";
import {
  getDesignerById,
  listLiveMarketplaceDesignerIds,
  resolveDesignerProfileId,
} from "@/lib/services/designerService";
import {
  getCustomerById,
  getCustomerLinkState,
  listCustomersForDesigner,
  resolveCustomerProfileId,
} from "@/lib/services/customerService";
import { listMarketplaceApprovals } from "@/lib/services/marketplaceService";

export interface AdminDesignerDetail {
  designer: Designer;
  email: string;
  profileUuid: string;
  marketplaceLive: boolean;
  pendingApproval: MarketplaceApproval | null;
  clients: Customer[];
  projects: Project[];
  adminNotes: string;
}

export interface AdminCustomerDetail {
  customer: Customer;
  profileUuid: string;
  link: CustomerLinkState;
  linkedDesigner: Designer | null;
  projects: Project[];
  adminNotes: string;
}

async function mapProjectsWithReferences(projects: DbProject[]): Promise<Project[]> {
  if (!projects.length) return [];

  const supabase = createClient();
  const projectIds = projects.map((project) => project.id);
  const { data: references, error } = await supabase
    .from("customer_references")
    .select("*")
    .in("project_id", projectIds);
  if (error) throw new Error(error.message);

  return projects.map((project) =>
    mapProject(
      project,
      (references ?? []).filter((reference) => reference.project_id === project.id)
    )
  );
}

async function fetchProjectsForDesignerProfileId(profileUuid: string): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("designer_id", profileUuid)
    .order("project_code", { ascending: false });
  if (error) throw new Error(error.message);
  return mapProjectsWithReferences(data ?? []);
}

async function fetchProjectsForCustomerProfileId(profileUuid: string): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("customer_id", profileUuid)
    .order("project_code", { ascending: false });
  if (error) throw new Error(error.message);
  return mapProjectsWithReferences(data ?? []);
}

function findPendingApproval(
  approvals: MarketplaceApproval[],
  designerLegacyId: string,
  profileUuid: string
): MarketplaceApproval | null {
  return (
    approvals.find(
      (approval) =>
        approval.status === "pending" &&
        (approval.designerId === designerLegacyId || approval.designerId === profileUuid)
    ) ?? null
  );
}

export async function getAdminDesignerDetail(
  designerKey: string
): Promise<AdminDesignerDetail | null> {
  const profileUuid = await resolveDesignerProfileId(designerKey);
  if (!profileUuid) return null;

  const designer = await getDesignerById(designerKey);
  if (!designer) return null;

  const supabase = createClient();
  const { data: moderation, error: profileError } = await supabase.rpc(
    "admin_get_designer_moderation",
    { p_designer_id: profileUuid }
  );
  if (profileError) throw new Error(profileError.message);

  const email = moderation?.[0]?.email ?? "";
  const adminNotes = moderation?.[0]?.admin_notes ?? "";

  const [clients, projects, approvals, liveIds] = await Promise.all([
    listCustomersForDesigner(designerKey),
    fetchProjectsForDesignerProfileId(profileUuid),
    listMarketplaceApprovals(),
    listLiveMarketplaceDesignerIds(),
  ]);

  return {
    designer,
    email,
    profileUuid,
    marketplaceLive: liveIds.includes(designer.id),
    pendingApproval: findPendingApproval(approvals, designer.id, profileUuid),
    clients,
    projects,
    adminNotes,
  };
}

export async function adminSetDesignerMarketplaceLive(designerKey: string, live: boolean) {
  const profileUuid = await resolveDesignerProfileId(designerKey);
  if (!profileUuid) throw new Error("Designer not found");

  const supabase = createClient();
  const { error } = await supabase.rpc("admin_set_marketplace_live", {
    p_designer_id: profileUuid,
    p_live: live,
  });
  if (error) throw new Error(error.message);

  return listLiveMarketplaceDesignerIds();
}

export async function getAdminCustomerDetail(
  customerKey: string
): Promise<AdminCustomerDetail | null> {
  const customer = await getCustomerById(customerKey);
  if (!customer) return null;

  const profileUuid = await resolveCustomerProfileId(customerKey);
  if (!profileUuid) return null;

  const supabase = createClient();
  const { data: profileRow, error: profileError } = await supabase
    .from("customer_profiles")
    .select("admin_notes")
    .eq("id", profileUuid)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);

  const [link, projects] = await Promise.all([
    getCustomerLinkState(profileUuid),
    fetchProjectsForCustomerProfileId(profileUuid),
  ]);

  const linkedDesigner = link.linkedDesignerId
    ? await getDesignerById(link.linkedDesignerId)
    : null;

  return {
    customer,
    profileUuid,
    link,
    linkedDesigner,
    projects,
    adminNotes: profileRow?.admin_notes ?? "",
  };
}

export async function updateAdminCustomerNotes(customerKey: string, adminNotes: string) {
  const profileUuid = await resolveCustomerProfileId(customerKey);
  if (!profileUuid) throw new Error("Customer not found");

  const supabase = createClient();
  const { error } = await supabase
    .from("customer_profiles")
    .update({ admin_notes: adminNotes || null, updated_at: new Date().toISOString() })
    .eq("id", profileUuid);
  if (error) throw new Error(error.message);
}

export async function updateAdminDesignerNotes(designerKey: string, adminNotes: string) {
  const profileUuid = await resolveDesignerProfileId(designerKey);
  if (!profileUuid) throw new Error("Designer not found");

  const supabase = createClient();
  const { error } = await supabase.rpc("admin_set_designer_notes", {
    p_designer_id: profileUuid,
    p_notes: adminNotes,
  });
  if (error) throw new Error(error.message);
}
