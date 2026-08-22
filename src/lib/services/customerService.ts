import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { mapCustomer, mapCustomerLink } from "@/lib/supabase/mappers";
import type { CustomerLinkState } from "@/lib/customer-access";
import type { Customer } from "@/lib/mock-data";
import type { DbCustomerProfile } from "@/lib/types/database";
import {
  PUBLIC_DESIGNER_PROFILE_SELECT,
  resolveDesignerProfileId,
} from "@/lib/services/designerService";

async function fetchCustomerProjectCounts(): Promise<Map<string, number>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("projects").select("customer_id");
  if (error) throw new Error(error.message);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.customer_id) continue;
    counts.set(row.customer_id, (counts.get(row.customer_id) ?? 0) + 1);
  }
  return counts;
}

async function fetchProjectCountForCustomer(customerProfileId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerProfileId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function emptyCustomerLinkState(registrationType: CustomerLinkState["registrationType"] = null): CustomerLinkState {
  return {
    linkedDesignerId: null,
    linkedDesignerName: null,
    hasConcludedProject: false,
    unlinkStatus: "none",
    unlinkReason: null,
    unlinkSubmittedAt: null,
    activeUnlinkRequestId: null,
    registrationType,
  };
}

export async function listCustomers(): Promise<Customer[]> {
  const supabase = createClient();
  const [{ data, error }, projectCounts] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("*, users!inner(role)")
      .eq("users.role", "customer")
      .order("name"),
    fetchCustomerProjectCounts(),
  ]);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const profile = row as DbCustomerProfile;
    return mapCustomer(profile, projectCounts.get(profile.id) ?? 0);
  });
}

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("*, users(profile_image)")
    .or(legacyOrIdFilter(customerId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const userImage = (data.users as { profile_image?: string } | null)?.profile_image;
  const profile = {
    ...data,
    profile_image: data.profile_image?.trim() || userImage?.trim() || "",
  } as DbCustomerProfile;

  const projectCount = await fetchProjectCountForCustomer(profile.id);
  return mapCustomer(profile, projectCount);
}

export async function getCustomerLinkState(customerProfileId: string): Promise<CustomerLinkState> {
  const supabase = createClient();
  const { data: customer, error } = await supabase
    .from("customer_profiles")
    .select("*")
    .or(legacyOrIdFilter(customerProfileId))
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!customer) return emptyCustomerLinkState();

  const { data: relationship } = await supabase
    .from("designer_customer_relationships")
    .select("designer_id")
    .eq("customer_id", customer.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let designer = null;
  if (relationship?.designer_id) {
    const { data } = await supabase
      .from("designer_profiles")
      .select(PUBLIC_DESIGNER_PROFILE_SELECT)
      .eq("id", relationship.designer_id)
      .maybeSingle();
    designer = data;
  }

  const base = mapCustomerLink(customer, designer);

  if (!relationship?.designer_id) {
    const { data: approvedRequest } = await supabase
      .from("unlink_requests")
      .select("id, status")
      .eq("customer_id", customer.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (approvedRequest) {
      return {
        ...base,
        unlinkStatus: "approved",
        unlinkReason: null,
        unlinkSubmittedAt: null,
        activeUnlinkRequestId: approvedRequest.id,
      };
    }

    return {
      ...base,
      unlinkStatus: "none",
      unlinkReason: null,
      unlinkSubmittedAt: null,
      activeUnlinkRequestId: null,
    };
  }

  const { data: openRequest } = await supabase
    .from("unlink_requests")
    .select("id, status, reason, submitted_at")
    .eq("customer_id", customer.id)
    .eq("designer_id", relationship.designer_id)
    .in("status", ["pending", "designer_review"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openRequest) {
    return {
      ...base,
      unlinkStatus: openRequest.status as CustomerLinkState["unlinkStatus"],
      unlinkReason: openRequest.reason,
      unlinkSubmittedAt: openRequest.submitted_at,
      activeUnlinkRequestId: openRequest.id,
    };
  }

  return {
    ...base,
    unlinkStatus: "none",
    unlinkReason: null,
    unlinkSubmittedAt: null,
    activeUnlinkRequestId: null,
  };
}

export async function patchCustomerLink(
  customerProfileId: string,
  patch: Partial<CustomerLinkState>
) {
  const supabase = createClient();
  const { data: customer } = await supabase
    .from("customer_profiles")
    .select("id, registration_type")
    .or(legacyOrIdFilter(customerProfileId))
    .maybeSingle();
  if (!customer) throw new Error("Customer not found");

  const resolvedRegistrationType =
    patch.registrationType ?? customer.registration_type ?? ("invited" as const);

  const profilePatch: {
    unlink_status?: CustomerLinkState["unlinkStatus"];
    unlink_reason?: string | null;
    unlink_submitted_at?: string | null;
    active_unlink_request_id?: string | null;
    registration_type?: CustomerLinkState["registrationType"];
  } = {};

  if (patch.unlinkStatus !== undefined) profilePatch.unlink_status = patch.unlinkStatus;
  if (patch.unlinkReason !== undefined) profilePatch.unlink_reason = patch.unlinkReason;
  if (patch.unlinkSubmittedAt !== undefined) profilePatch.unlink_submitted_at = patch.unlinkSubmittedAt;
  if (patch.activeUnlinkRequestId !== undefined) {
    profilePatch.active_unlink_request_id = patch.activeUnlinkRequestId;
  }
  if (patch.registrationType !== undefined) {
    profilePatch.registration_type = patch.registrationType;
  }

  // has_concluded_project is server-gated (delivery completion RPC only).
  if (Object.keys(profilePatch).length > 0) {
    const { error } = await supabase
      .from("customer_profiles")
      .update(profilePatch)
      .eq("id", customer.id);
    if (error) throw new Error(error.message);
  }

  if (patch.hasConcludedProject === true) {
    const { error: concludedError } = await supabase.rpc("mark_customer_project_concluded", {
      p_customer_id: customer.id,
    });
    if (concludedError) {
      // Customers cannot self-set this; ignore client attempts outside completion flows.
      if (!/has_concluded_project|Not authorized|No completed project/i.test(concludedError.message)) {
        throw new Error(concludedError.message);
      }
    }
  }

  if (patch.linkedDesignerId !== undefined) {
    if (patch.linkedDesignerId === null) {
      // Prefer SECURITY DEFINER RPC so RLS cannot leave a stale active link.
      const { error: rpcError } = await supabase.rpc("deactivate_customer_relationships", {
        p_customer_id: customer.id,
      });
      if (rpcError) {
        const { error: relationshipError } = await supabase
          .from("designer_customer_relationships")
          .update({ is_active: false })
          .eq("customer_id", customer.id)
          .eq("is_active", true);
        if (relationshipError) throw new Error(relationshipError.message);
      }
    } else {
      // Starting a new link clears a prior approved unlink so heal logic won't
      // immediately deactivate the relationship we are about to create.
      if (patch.unlinkStatus === undefined) {
        profilePatch.unlink_status = "none";
        profilePatch.unlink_reason = null;
        profilePatch.unlink_submitted_at = null;
        profilePatch.active_unlink_request_id = null;
        const { error: clearUnlinkError } = await supabase
          .from("customer_profiles")
          .update(profilePatch)
          .eq("id", customer.id);
        if (clearUnlinkError) throw new Error(clearUnlinkError.message);
      }

      const { resolveDesignerProfileId } = await import("@/lib/services/designerService");
      const designerId = await resolveDesignerProfileId(patch.linkedDesignerId);
      if (!designerId) throw new Error("Designer not found");

      const { error: relationshipError } = await supabase.from("designer_customer_relationships").upsert(
        {
          designer_id: designerId,
          customer_id: customer.id,
          registration_type: resolvedRegistrationType,
          is_active: true,
        },
        { onConflict: "designer_id,customer_id" }
      );
      if (relationshipError) throw new Error(relationshipError.message);
    }
  }

  const next = await getCustomerLinkState(customer.id);
  if (patch.linkedDesignerId === null && next.linkedDesignerId) {
    throw new Error("Could not clear the designer link. Ask admin to re-approve the unlink.");
  }
  if (
    patch.linkedDesignerId &&
    patch.linkedDesignerId !== null &&
    !next.linkedDesignerId
  ) {
    throw new Error("Could not link to this designer. Try again or pick another artisan.");
  }
  return next;
}

export async function listActiveDesignerIdsForCustomer(
  customerLegacyId: string
): Promise<string[]> {
  const supabase = createClient();
  const customerId = await resolveCustomerProfileId(customerLegacyId);
  if (!customerId) return [];

  const { data, error } = await supabase
    .from("designer_customer_relationships")
    .select("designer_id")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.designer_id);
}

export async function updateCustomerProfile(
  customerLegacyId: string,
  patch: {
    name?: string;
    location?: string;
    phone?: string;
    profileImage?: string;
    styleNotes?: string;
  }
) {
  const supabase = createClient();
  const profileId = await resolveCustomerProfileId(customerLegacyId);
  if (!profileId) throw new Error("Customer not found");

  const { data, error } = await supabase
    .from("customer_profiles")
    .update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone.trim() } : {}),
      ...(patch.profileImage !== undefined ? { profile_image: patch.profileImage } : {}),
      ...(patch.styleNotes !== undefined ? { style_notes: patch.styleNotes } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .select("*, users(profile_image)")
    .single();
  if (error) throw new Error(error.message);

  if (patch.profileImage !== undefined && data.user_id) {
    await supabase
      .from("users")
      .update({ profile_image: patch.profileImage, updated_at: new Date().toISOString() })
      .eq("id", data.user_id);
  }

  const userImage = (data.users as { profile_image?: string } | null)?.profile_image;
  const profile = {
    ...data,
    profile_image: data.profile_image?.trim() || userImage?.trim() || "",
  } as DbCustomerProfile;

  return mapCustomer(profile);
}

export async function resolveCustomerProfileId(customerId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("customer_profiles")
    .select("id")
    .or(legacyOrIdFilter(customerId))
    .maybeSingle();
  return data?.id ?? null;
}

export async function getCustomerForDesigner(
  designerLegacyId: string,
  customerId: string
): Promise<Customer | null> {
  if (!designerLegacyId || !customerId) return null;
  const linked = await listCustomersForDesigner(designerLegacyId);
  return linked.find((customer) => customer.id === customerId) ?? null;
}

export async function listCustomersForDesigner(designerLegacyId: string): Promise<Customer[]> {
  const supabase = createClient();
  const designerId = await resolveDesignerProfileId(designerLegacyId);
  if (!designerId) return [];

  const { data: relationships, error } = await supabase
    .from("designer_customer_relationships")
    .select("customer_id")
    .eq("designer_id", designerId)
    .eq("is_active", true);
  if (error) throw new Error(error.message);

  const customerIds = (relationships ?? []).map((row) => row.customer_id);
  if (!customerIds.length) return [];

  const { data: customers, error: customerError } = await supabase
    .from("customer_profiles")
    .select("*, users(profile_image)")
    .in("id", customerIds)
    .order("name");
  if (customerError) throw new Error(customerError.message);

  const projectCounts = await fetchCustomerProjectCounts();
  return (customers ?? []).map((row) => {
    const userImage = (row.users as { profile_image?: string } | null)?.profile_image;
    const profile = {
      ...row,
      profile_image: row.profile_image?.trim() || userImage?.trim() || "",
    } as DbCustomerProfile;
    return mapCustomer(profile, projectCounts.get(row.id) ?? 0);
  });
}
