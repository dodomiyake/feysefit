import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import {
  mapDesigner,
  PUBLIC_DESIGNER_PROFILE_COLUMNS,
  type PublicDesignerProfile,
} from "@/lib/supabase/mappers";
import type { Designer } from "@/lib/mock-data";
import { logDevSupabaseError } from "@/lib/supabase-errors";

type Join<T extends readonly string[], Separator extends string> = T extends readonly [
  infer First extends string,
  ...infer Rest extends string[],
]
  ? Rest extends []
    ? First
    : `${First}${Separator}${Join<Rest, Separator>}`
  : never;

export const PUBLIC_DESIGNER_PROFILE_SELECT = PUBLIC_DESIGNER_PROFILE_COLUMNS.join(
  ", "
) as Join<typeof PUBLIC_DESIGNER_PROFILE_COLUMNS, ", ">;

export const PRIVATE_DESIGNER_PROFILE_COLUMNS = ["user_id", "admin_notes", "phone"] as const;

type PublicMarketplaceClient = Pick<ReturnType<typeof createClient>, "from">;

function attachPublicPortfolioImages(
  designers: PublicDesignerProfile[],
  portfolios: Array<{ designer_id: string; url: string }> | null
): Designer[] {
  return designers.map((row) => {
    const images =
      portfolios?.filter((image) => image.designer_id === row.id).map((image) => image.url) ?? [];
    return mapDesigner(row, images);
  });
}

/**
 * Anonymous marketplace directory. Uses the public projection, not designer_profiles.
 * Column lists in the client are not a security boundary — the view omits private fields.
 */
export async function listPublicMarketplaceDesigners(
  client: PublicMarketplaceClient = createClient()
): Promise<Designer[]> {
  const { data: designers, error } = await client
    .from("marketplace_designers")
    .select(PUBLIC_DESIGNER_PROFILE_SELECT)
    .order("designer_name");
  if (error) {
    logDevSupabaseError("listPublicMarketplaceDesigners.marketplace_designers", error);
    throw new Error(error.message);
  }

  const liveDesigners = (designers ?? []) as PublicDesignerProfile[];
  if (!liveDesigners.length) return [];

  const designerIds = liveDesigners.map((row) => row.id);
  const { data: portfolios, error: portfolioError } = await client
    .from("portfolio_images")
    .select("designer_id, url, sort_order")
    .eq("is_public", true)
    .in("designer_id", designerIds)
    .order("sort_order");
  if (portfolioError) {
    logDevSupabaseError("listPublicMarketplaceDesigners.portfolio_images", portfolioError);
    throw new Error(portfolioError.message);
  }

  return attachPublicPortfolioImages(liveDesigners, portfolios);
}

export async function listDesigners(): Promise<Designer[]> {
  const supabase = createClient();
  const { data: designers, error } = await supabase
    .from("designer_profiles")
    .select(PUBLIC_DESIGNER_PROFILE_SELECT)
    .order("designer_name");
  if (error) throw new Error(error.message);

  const { data: portfolios } = await supabase
    .from("portfolio_images")
    .select("designer_id, url, sort_order")
    .order("sort_order");

  return ((designers ?? []) as PublicDesignerProfile[]).map((row) => {
    const images =
      portfolios?.filter((p) => p.designer_id === row.id).map((p) => p.url) ?? [];
    return mapDesigner(row, images);
  });
}

export async function getDesignerById(designerId: string): Promise<Designer | null> {
  if (!designerId) return null;
  const supabase = createClient();
  const { data: publicRow, error: publicError } = await supabase
    .from("marketplace_designers")
    .select(PUBLIC_DESIGNER_PROFILE_SELECT)
    .or(legacyOrIdFilter(designerId))
    .maybeSingle();
  if (publicError) throw new Error(publicError.message);

  let data = publicRow;
  if (!data) {
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return null;
    const { data: privileged, error } = await supabase
      .from("designer_profiles")
      .select(PUBLIC_DESIGNER_PROFILE_SELECT)
      .or(legacyOrIdFilter(designerId))
      .maybeSingle();
    if (error) throw new Error(error.message);
    data = privileged;
  }
  if (!data) return null;

  const { data: portfolios } = await supabase
    .from("portfolio_images")
    .select("url, sort_order")
    .eq("designer_id", data.id)
    .order("sort_order");

  return mapDesigner(
    data as PublicDesignerProfile,
    (portfolios ?? []).map((item) => item.url)
  );
}

/** Own-profile contact only — never used by the anonymous marketplace query. */
export async function getOwnDesignerContact(): Promise<string> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getUser();
  if (!sessionData.user) return "";

  const { data, error } = await supabase
    .from("designer_private_details")
    .select("phone")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.phone?.trim() ?? "";
}

async function upsertOwnDesignerPhone(designerId: string, phone: string) {
  const supabase = createClient();
  const { error } = await supabase.from("designer_private_details").upsert(
    {
      designer_id: designerId,
      phone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "designer_id" }
  );
  if (error) throw new Error(error.message);
}

export async function listLiveMarketplaceDesignerIds(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("marketplace_designers")
    .select("id, legacy_id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.legacy_id ?? row.id);
}

export async function setDesignerMarketplaceLive(designerProfileId: string, live: boolean) {
  const supabase = createClient();
  if (live) {
    const { error } = await supabase.rpc("admin_set_marketplace_live", {
      p_designer_id: designerProfileId,
      p_live: true,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error: withdrawError } = await supabase.rpc("withdraw_own_marketplace_listing");
    if (withdrawError) {
      const { error } = await supabase.rpc("admin_set_marketplace_live", {
        p_designer_id: designerProfileId,
        p_live: false,
      });
      if (error) throw new Error(error.message);
    }
  }
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
    tagline?: string;
    phone?: string;
    serviceAreas?: string[];
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
      ...(patch.tagline !== undefined ? { tagline: patch.tagline } : {}),
      ...(patch.serviceAreas !== undefined ? { service_areas: patch.serviceAreas } : {}),
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
    .select(PUBLIC_DESIGNER_PROFILE_SELECT)
    .single();
  if (error) throw new Error(error.message);
  if (patch.phone !== undefined) {
    await upsertOwnDesignerPhone(designerId, patch.phone);
  }
  return mapDesigner(data as PublicDesignerProfile);
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
