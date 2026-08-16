import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { mapMarketplaceListing } from "@/lib/supabase/mappers";
import type { MarketplaceApproval } from "@/lib/marketplace-approvals";
import {
  listLiveMarketplaceDesignerIds,
  resolveDesignerProfileId,
  setDesignerMarketplaceLive,
} from "@/lib/services/designerService";

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
