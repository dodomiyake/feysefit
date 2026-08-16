import { createClient } from "@/lib/supabase/client";
import type {
  MarketplaceEnquiry,
  MarketplaceEnquiryMessage,
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
  customer_agreed_at: string | null;
  created_at: string;
  updated_at: string;
};

type MarketplaceEnquiryMessageRow = {
  id: string;
  enquiry_id: string;
  sender_role: "customer" | "designer";
  sender_name: string;
  body: string;
  created_at: string;
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
    customerAgreedAt: row.customer_agreed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMarketplaceEnquiryMessage(
  row: MarketplaceEnquiryMessageRow
): MarketplaceEnquiryMessage {
  return {
    id: row.id,
    enquiryId: row.enquiry_id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    body: row.body,
    createdAt: row.created_at,
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
  if (/no longer open|not open for discussion|no longer awaiting|expired/i.test(message)) {
    return new Error("This enquiry is no longer open for discussion.");
  }
  if (/reply required to accept/i.test(message)) {
    return new Error("Write a reply before accepting this enquiry for discussion.");
  }
  if (/designer reply required/i.test(message)) {
    return new Error("Wait for the designer to reply before confirming that you are ready.");
  }
  if (/client agreement required|reconfirm/i.test(message)) {
    return new Error("The client must confirm the latest discussion before the accounts can be linked.");
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

export async function listMarketplaceEnquiryMessages(
  enquiryIds: string[]
): Promise<Record<string, MarketplaceEnquiryMessage[]>> {
  if (enquiryIds.length === 0) return {};

  const supabase = createClient();
  const { data, error } = await supabase
    .from("marketplace_enquiry_messages")
    .select("id,enquiry_id,sender_role,sender_name,body,created_at")
    .in("enquiry_id", enquiryIds)
    .order("created_at", { ascending: true });
  if (error) throw enquiryError(error.message);

  return ((data ?? []) as MarketplaceEnquiryMessageRow[]).reduce<
    Record<string, MarketplaceEnquiryMessage[]>
  >((grouped, row) => {
    const message = mapMarketplaceEnquiryMessage(row);
    (grouped[message.enquiryId] ??= []).push(message);
    return grouped;
  }, {});
}

export async function sendMarketplaceEnquiryMessage(input: {
  enquiryId: string;
  body: string;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("send_marketplace_enquiry_message", {
    p_enquiry_id: input.enquiryId,
    p_body: input.body.trim(),
  });
  if (error) throw enquiryError(error.message);
  if (!data || typeof data !== "string") {
    throw new Error("The reply could not be sent. Please try again.");
  }
  return data;
}

export async function acceptMarketplaceEnquiryForDiscussion(input: {
  enquiryId: string;
  body: string;
}): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    "accept_marketplace_enquiry_for_discussion",
    {
      p_enquiry_id: input.enquiryId,
      p_body: input.body.trim(),
    }
  );
  if (error) throw enquiryError(error.message);
  if (!data || typeof data !== "string") {
    throw new Error("The enquiry could not be opened for discussion. Please try again.");
  }
  return data;
}

export async function confirmMarketplaceEnquiryCustomerAgreement(
  enquiryId: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc(
    "confirm_marketplace_enquiry_customer_agreement",
    { p_enquiry_id: enquiryId }
  );
  if (error) throw enquiryError(error.message);
}

export async function confirmMarketplaceEnquiryAgreement(enquiryId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("confirm_marketplace_enquiry_agreement", {
    p_enquiry_id: enquiryId,
  });
  if (error) throw enquiryError(error.message);
}

export async function respondToMarketplaceEnquiry(input: {
  enquiryId: string;
  decision: "declined";
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
