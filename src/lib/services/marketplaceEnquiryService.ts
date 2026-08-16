import { createClient } from "@/lib/supabase/client";
import type {
  MarketplaceEnquiry,
  MarketplaceEnquiryStatus,
} from "@/lib/marketplace-enquiries";
import { resolveDesignerProfileId } from "@/lib/services/designerService";

type MarketplaceEnquiryRow = {
  id: string;
  designer_id: string;
  customer_id: string;
  designer_name: string;
  customer_name: string;
  outfit_type: string;
  description: string;
  budget: string | null;
  preferred_deadline: string | null;
  consultation_preference: string | null;
  status: MarketplaceEnquiryStatus;
  designer_response: string | null;
  project_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapMarketplaceEnquiry(row: MarketplaceEnquiryRow): MarketplaceEnquiry {
  return {
    id: row.id,
    designerId: row.designer_id,
    customerId: row.customer_id,
    designerName: row.designer_name,
    customerName: row.customer_name,
    outfitType: row.outfit_type,
    description: row.description,
    budget: row.budget,
    preferredDeadline: row.preferred_deadline,
    consultationPreference: row.consultation_preference,
    status: row.status,
    designerResponse: row.designer_response,
    projectId: row.project_id,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function enquiryError(message: string): Error {
  if (/already pending|duplicate key/i.test(message)) {
    return new Error("You already have a pending enquiry with this designer.");
  }
  if (/pending enquiry limit/i.test(message)) {
    return new Error("You can have up to three pending enquiries at a time.");
  }
  if (/rate_limited/i.test(message)) {
    return new Error("Too many enquiries were sent. Please wait before trying again.");
  }
  if (/not accepting|not available/i.test(message)) {
    return new Error("This designer is not currently accepting marketplace enquiries.");
  }
  if (/no longer pending/i.test(message)) {
    return new Error("This enquiry has already been answered or closed.");
  }
  if (/customer account required/i.test(message)) {
    return new Error("Sign in as a client to send an enquiry.");
  }
  if (/designer account required|enquiry not found/i.test(message)) {
    return new Error("You are not authorised to manage this enquiry.");
  }
  return new Error("The enquiry could not be completed. Please try again.");
}

export async function createMarketplaceEnquiry(input: {
  designerLegacyId: string;
  outfitType: string;
  description: string;
  budget?: string;
  preferredDeadline?: string;
  consultationPreference?: string;
}): Promise<string> {
  const designerId = await resolveDesignerProfileId(input.designerLegacyId);
  if (!designerId) throw new Error("Designer not found.");

  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_marketplace_enquiry", {
    p_designer_id: designerId,
    p_outfit_type: input.outfitType,
    p_description: input.description,
    p_budget: input.budget?.trim() || null,
    p_preferred_deadline: input.preferredDeadline?.trim() || null,
    p_consultation_preference: input.consultationPreference?.trim() || null,
  });
  if (error) throw enquiryError(error.message);
  if (!data || typeof data !== "string") {
    throw new Error("The enquiry could not be created. Please try again.");
  }
  return data;
}

export async function listMarketplaceEnquiries(): Promise<MarketplaceEnquiry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("marketplace_enquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw enquiryError(error.message);
  return ((data ?? []) as MarketplaceEnquiryRow[]).map(mapMarketplaceEnquiry);
}

export async function getMarketplaceEnquiry(
  enquiryId: string
): Promise<MarketplaceEnquiry | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("marketplace_enquiries")
    .select("*")
    .eq("id", enquiryId)
    .maybeSingle();
  if (error) throw enquiryError(error.message);
  return data ? mapMarketplaceEnquiry(data as MarketplaceEnquiryRow) : null;
}

export async function respondToMarketplaceEnquiry(input: {
  enquiryId: string;
  decision: "accepted" | "declined";
  response?: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("respond_to_marketplace_enquiry", {
    p_enquiry_id: input.enquiryId,
    p_decision: input.decision,
    p_response: input.response?.trim() || null,
  });
  if (error) throw enquiryError(error.message);
}

export async function cancelMarketplaceEnquiry(enquiryId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("cancel_marketplace_enquiry", {
    p_enquiry_id: enquiryId,
  });
  if (error) throw enquiryError(error.message);
}

export async function createProjectFromMarketplaceEnquiry(
  enquiryId: string
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_project_from_marketplace_enquiry", {
    p_enquiry_id: enquiryId,
  });
  if (error) throw enquiryError(error.message);
  if (!data || typeof data !== "string") {
    throw new Error("The project could not be created. Please try again.");
  }
  return data;
}
