import { createClient } from "@/lib/supabase/client";
import { mapPendingInvite } from "@/lib/supabase/mappers";
import type { PendingInvite } from "@/lib/mock-data";
import { normalizeInviteCode } from "@/lib/invite-link";
import { isDeliverableEmail } from "@/lib/email/invite-email";
import { resolveDesignerProfileId } from "@/lib/services/designerService";
import { pendingInvites } from "@/lib/mock-data";
import { DEMO_DESIGNER_ID } from "@/lib/customer-access";
import { isSupabaseEnabled } from "@/lib/config/backend";

function generateInviteCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `FF-${hex.slice(0, 20).toUpperCase()}`;
}

export interface InviteDetails {
  invite: PendingInvite;
  designerName: string;
  businessName: string;
  designerLegacyId: string;
  status: "pending" | "accepted" | "expired";
}

export async function listInvites(designerLegacyId: string): Promise<PendingInvite[]> {
  const supabase = createClient();
  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) return [];

  const { data, error } = await supabase
    .from("invite_codes")
    .select("*")
    .eq("designer_id", designerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPendingInvite);
}

export async function createInvite(input: {
  designerLegacyId: string;
  name: string;
  email: string;
  projectType: string;
}) {
  const supabase = createClient();
  const designerId = await resolveDesignerProfileId(input.designerLegacyId);
  if (!designerId) throw new Error("Designer not found");

  const sentAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const { data, error } = await supabase
    .from("invite_codes")
    .insert({
      designer_id: designerId,
      code: generateInviteCode(),
      name: input.name,
      email: input.email,
      project_type: input.projectType,
      sent_at: sentAt,
      sent_ago: "Just now",
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapPendingInvite(data);
}

export async function getInviteByCode(code: string): Promise<InviteDetails | null> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return null;

  const response = await fetch("/auth/invite-lookup", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: normalized }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    found?: unknown;
    name?: unknown;
    projectType?: unknown;
    designerName?: unknown;
    businessName?: unknown;
  };
  if (payload.found !== true) return null;

  const name = typeof payload.name === "string" ? payload.name : "";
  const projectType = typeof payload.projectType === "string" ? payload.projectType : "";
  const designerName = typeof payload.designerName === "string" ? payload.designerName : "Your designer";
  const businessName = typeof payload.businessName === "string" ? payload.businessName : "";

  return {
    invite: mapPendingInvite({
      id: "",
      legacy_id: null,
      designer_id: "",
      code: normalized,
      name,
      email: "",
      project_type: projectType,
      sent_at: "",
      sent_ago: "",
      status: "pending",
      created_at: new Date().toISOString(),
    }),
    designerName,
    businessName,
    designerLegacyId: "",
    status: "pending",
  };
}

export function resolveLocalInviteDesignerId(code: string): string | null {
  const normalized = normalizeInviteCode(code);
  const match = pendingInvites.find(
    (invite) => normalizeInviteCode(invite.code) === normalized && invite.status === "pending"
  );
  return match ? DEMO_DESIGNER_ID : null;
}

export async function resolveDesignerLegacyIdFromInviteCode(code: string): Promise<string | null> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return null;

  if (!isSupabaseEnabled()) {
    return resolveLocalInviteDesignerId(normalized);
  }

  const details = await getInviteByCode(normalized);
  if (!details) return null;
  return details.designerLegacyId || null;
}

export async function cancelInvite(inviteId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("invite_codes")
    .update({ status: "expired" })
    .eq("id", inviteId);
  if (error) throw new Error(error.message);
}

export async function acceptInviteCode(code: string) {
  const supabase = createClient();
  const normalized = normalizeInviteCode(code);
  const { error } = await supabase.rpc("accept_customer_invite", {
    invite_code: normalized,
  });
  if (error) throw new Error(error.message);
}

export async function syncPendingInviteFromAuthMetadata() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const inviteCode = user?.user_metadata?.invite_code;
  if (!inviteCode || typeof inviteCode !== "string") return false;

  await acceptInviteCode(inviteCode);
  return true;
}

export async function sendInviteEmailNotification(input: {
  inviteId: string;
  customerEmail: string;
  customerName: string;
  projectType: string;
  inviteCode: string;
  personalMessage?: string;
}) {
  if (!isDeliverableEmail(input.customerEmail)) {
    throw new Error("A valid client email address is required.");
  }

  const response = await fetch("/api/v1/invites/send-email", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inviteId: input.inviteId,
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerName: input.customerName,
      projectType: input.projectType,
      inviteCode: normalizeInviteCode(input.inviteCode),
      personalMessage: input.personalMessage,
    }),
  });

  const payload = (await response.json()) as { data?: { sent: boolean }; error?: string };
  if (!response.ok || payload.error) {
    throw new Error(payload.error ?? "Could not send invitation email.");
  }
}

export function resolveCustomerEmailFromContact(contact: string) {
  const trimmed = contact.trim();
  if (!trimmed.includes("@")) return null;
  const email = trimmed.toLowerCase();
  return isDeliverableEmail(email) ? email : null;
}
