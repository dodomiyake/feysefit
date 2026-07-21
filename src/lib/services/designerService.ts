import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { mapDesigner } from "@/lib/supabase/mappers";
import type { Designer } from "@/lib/mock-data";

export async function listDesigners(): Promise<Designer[]> {
  const supabase = createClient();
  const { data: designers, error } = await supabase
    .from("designer_profiles")
    .select("*")
    .order("designer_name");
  if (error) throw new Error(error.message);

  const { data: portfolios } = await supabase
    .from("portfolio_images")
    .select("designer_id, url, sort_order")
    .order("sort_order");

  return (designers ?? []).map((row) => {
    const images =
      portfolios?.filter((p) => p.designer_id === row.id).map((p) => p.url) ?? [];
    return mapDesigner(row, images);
  });
}

export async function getDesignerById(designerId: string): Promise<Designer | null> {
  if (!designerId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("designer_profiles")
    .select("*")
    .or(legacyOrIdFilter(designerId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: portfolios } = await supabase
    .from("portfolio_images")
    .select("url, sort_order")
    .eq("designer_id", data.id)
    .order("sort_order");

  return mapDesigner(
    data,
    (portfolios ?? []).map((item) => item.url)
  );
}

export async function listLiveMarketplaceDesignerIds(): Promise<string[]> {
  const supabase = createClient();
  // A boolean flag alone is not sufficient: only an admin-approved listing may
  // make a designer discoverable. This also protects deployments that have not
  // yet applied the database trigger hardening patch.
  const { data: approvedListings, error: approvalError } = await supabase
    .from("marketplace_listings")
    .select("designer_id")
    .eq("status", "approved");
  if (approvalError) throw new Error(approvalError.message);

  const approvedDesignerIds = Array.from(
    new Set((approvedListings ?? []).map((listing) => listing.designer_id))
  );
  if (!approvedDesignerIds.length) return [];

  const { data, error } = await supabase
    .from("designer_profiles")
    .select("id, legacy_id")
    .eq("marketplace_live", true)
    .in("id", approvedDesignerIds);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.legacy_id ?? row.id);
}

export async function setDesignerMarketplaceLive(designerProfileId: string, live: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("designer_profiles")
    .update({ marketplace_live: live })
    .eq("id", designerProfileId);
  if (error) throw new Error(error.message);
  return listLiveMarketplaceDesignerIds();
}

export async function resolveDesignerProfileId(designerId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("designer_profiles")
    .select("id")
    .or(legacyOrIdFilter(designerId))
    .maybeSingle();
  return data?.id ?? null;
}

export async function updateDesignerProfile(
  designerLegacyId: string,
  patch: {
    businessName?: string;
    designerName?: string;
    location?: string;
    specialty?: string;
    bio?: string;
    coverImage?: string;
    profileImage?: string;
    city?: string;
    country?: string;
    offersInPerson?: boolean;
    priceRangeMin?: number | null;
    priceRangeMax?: number | null;
    yearsExperience?: number | null;
    offeredMeetingModes?: string[];
  }
) {
  const supabase = createClient();
  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) throw new Error("Designer not found");

  const { data, error } = await supabase
    .from("designer_profiles")
    .update({
      ...(patch.businessName !== undefined ? { business_name: patch.businessName } : {}),
      ...(patch.designerName !== undefined ? { designer_name: patch.designerName } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.specialty !== undefined ? { specialty: patch.specialty } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
      ...(patch.coverImage !== undefined ? { cover_image: patch.coverImage } : {}),
      ...(patch.profileImage !== undefined ? { profile_image: patch.profileImage } : {}),
      ...(patch.city !== undefined ? { city: patch.city.trim() } : {}),
      ...(patch.country !== undefined ? { country: patch.country.trim() } : {}),
      ...(patch.offersInPerson !== undefined ? { offers_in_person: patch.offersInPerson } : {}),
      ...(patch.priceRangeMin !== undefined ? { price_range_min: patch.priceRangeMin } : {}),
      ...(patch.priceRangeMax !== undefined ? { price_range_max: patch.priceRangeMax } : {}),
      ...(patch.yearsExperience !== undefined ? { years_experience: patch.yearsExperience } : {}),
      ...(patch.offeredMeetingModes !== undefined
        ? { offered_meeting_modes: patch.offeredMeetingModes }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", designerId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapDesigner(data);
}

export async function replacePortfolioImages(designerLegacyId: string, urls: string[]) {
  const supabase = createClient();
  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) throw new Error("Designer not found");

  const { error: deleteError } = await supabase
    .from("portfolio_images")
    .delete()
    .eq("designer_id", designerId);
  if (deleteError) throw new Error(deleteError.message);

  if (!urls.length) return [];

  const { error: insertError } = await supabase.from("portfolio_images").insert(
    urls.map((url, index) => ({
      designer_id: designerId,
      url,
      sort_order: index,
      is_public: true,
    }))
  );
  if (insertError) throw new Error(insertError.message);
  return urls;
}
