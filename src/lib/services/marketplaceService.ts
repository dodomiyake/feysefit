import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { mapMarketplaceListing } from "@/lib/supabase/mappers";
import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import { isSupabaseEnabled } from "@/lib/config/backend";
import { projectOutfitTypes } from "@/lib/project-outfit-types";
import { patchCustomerLink, resolveCustomerProfileId } from "@/lib/services/customerService";
import { sendProjectMessage } from "@/lib/services/messageService";
import { createProjectForDesignerLegacyId } from "@/lib/services/projectService";
import {
  listLiveMarketplaceDesignerIds,
  resolveDesignerProfileId,
  setDesignerMarketplaceLive,
} from "@/lib/services/designerService";

export interface MarketplaceDesignRequestInput {
  designerLegacyId: string;
  designerDisplayName: string;
  customerLegacyId: string;
  customerName: string;
  customerUserId?: string;
  outfitType: string;
  description: string;
  budget?: string;
  deadline?: string;
}

export function resolveMarketplaceOutfitLabel(outfitType: string): string {
  return projectOutfitTypes.find((option) => option.value === outfitType)?.label ?? outfitType;
}

function formatRequestDeadline(value?: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "TBD";
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return trimmed;
  return new Date(parsed).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function buildMarketplaceRequestMessage(input: {
  designerFirstName?: string;
  outfitLabel: string;
  description: string;
  budget?: string;
  deadline?: string;
}): string {
  const greeting = input.designerFirstName?.trim()
    ? `Hi ${input.designerFirstName.trim()}`
    : "Hi";
  const budget = input.budget?.trim() || "Not specified";
  const deadline = formatRequestDeadline(input.deadline);

  return [
    `${greeting}, I'd like to request a custom design through the FeyseFit marketplace.`,
    "",
    `Outfit: ${input.outfitLabel}`,
    `Budget: ${budget}`,
    `Deadline: ${deadline}`,
    "",
    "Vision:",
    input.description.trim(),
  ].join("\n");
}

function buildProjectCustomerUpdate(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) return "Marketplace design request submitted.";
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

export async function submitMarketplaceDesignRequest(
  input: MarketplaceDesignRequestInput
): Promise<{ projectId: string }> {
  if (!isSupabaseEnabled()) {
    throw new Error("Connect Supabase to submit marketplace design requests.");
  }

  const outfitLabel = resolveMarketplaceOutfitLabel(input.outfitType);
  const budget = input.budget?.trim() || "TBD";
  const deadline = formatRequestDeadline(input.deadline);
  const description = input.description.trim();
  if (!description) {
    throw new Error("Describe your vision before sending the request.");
  }

  const designerProfileId = await resolveDesignerProfileId(input.designerLegacyId);
  if (!designerProfileId) throw new Error("Designer not found");

  const supabase = createClient();

  // Prefer privileged RPC so unlink-heal / multi-link RLS cannot break requests.
  const { error: linkRpcError } = await supabase.rpc("link_customer_to_marketplace_designer", {
    p_designer_id: designerProfileId,
  });

  if (linkRpcError) {
    // Fallback when SQL patch has not been applied yet.
    await patchCustomerLink(input.customerLegacyId, {
      linkedDesignerId: input.designerLegacyId,
      linkedDesignerName: input.designerDisplayName,
      registrationType: "direct",
      unlinkStatus: "none",
      unlinkReason: null,
      unlinkSubmittedAt: null,
      activeUnlinkRequestId: null,
    });
  }

  const customerProfileId = await resolveCustomerProfileId(input.customerLegacyId);
  if (!customerProfileId) throw new Error("Client profile not found.");

  const { data: linked } = await supabase
    .from("designer_customer_relationships")
    .select("id")
    .eq("designer_id", designerProfileId)
    .eq("customer_id", customerProfileId)
    .eq("is_active", true)
    .maybeSingle();

  if (!linked) {
    throw new Error(
      "Could not link to this designer. Run the marketplace link SQL patch in Supabase, then try again."
    );
  }

  const project = await createProjectForDesignerLegacyId(
    input.designerLegacyId,
    {
      title: `${outfitLabel} — ${input.customerName}`,
      customerId: input.customerLegacyId,
      customerName: input.customerName,
      outfitType: outfitLabel,
      deadline,
      budget,
      customerUpdate: buildProjectCustomerUpdate(description),
      internalNotes: "Created from marketplace design request.",
      description: description.trim(),
    },
    { skipActiveLinkCheck: true }
  );

  const designerFirstName = input.designerDisplayName.split(" ")[0];
  await sendProjectMessage({
    conversationId: `project-${project.id}`,
    text: buildMarketplaceRequestMessage({
      designerFirstName,
      outfitLabel,
      description,
      budget: input.budget,
      deadline: input.deadline,
    }),
    senderRole: "customer",
    senderName: input.customerName,
    senderUserId: input.customerUserId,
    authUser: {
      id: input.customerUserId ?? "",
      name: input.customerName,
      role: "customer",
      customerId: input.customerLegacyId,
    },
  });

  return { projectId: project.id };
}

export async function listMarketplaceApprovals(): Promise<MarketplaceApproval[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...mapMarketplaceListing(row),
    designerId: row.designer_id,
  }));
}

export async function submitMarketplaceListing(input: {
  designerLegacyId: string;
  designerName: string;
  businessName: string;
  specialty: string;
}) {
  const supabase = createClient();
  const designerId = await resolveDesignerProfileId(input.designerLegacyId);
  if (!designerId) throw new Error("Designer not found");

  const { data, error } = await supabase
    .from("marketplace_listings")
    .insert({
      designer_id: designerId,
      designer_name: input.designerName,
      business_name: input.businessName,
      specialty: input.specialty,
      submitted_at: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { ...mapMarketplaceListing(data), designerId };
}

export async function updateMarketplaceListing(
  approvalId: string,
  patch: Partial<MarketplaceApproval>
) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("marketplace_listings")
    .select("*")
    .or(legacyOrIdFilter(approvalId))
    .maybeSingle();
  if (!existing) throw new Error("Listing not found");

  const { data, error } = await supabase
      .from("marketplace_listings")
      .update({
        status: patch.status,
        admin_notes: patch.adminNotes,
        decline_reason: patch.declineReason,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
  if (error) throw new Error(error.message);

  if (patch.status === "approved") {
    await setDesignerMarketplaceLive(existing.designer_id, true);
  } else if (patch.status === "declined") {
    // Revoking/declining approval must immediately remove an existing listing.
    await setDesignerMarketplaceLive(existing.designer_id, false);
  }

  return { ...mapMarketplaceListing(data), designerId: data.designer_id };
}

export { listLiveMarketplaceDesignerIds };
