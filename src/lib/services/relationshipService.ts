import { createClient } from "@/lib/supabase/client";
import { legacyOrIdFilter } from "@/lib/legacy-id-lookup";
import { profileId, mapUnlinkRequest } from "@/lib/supabase/mappers";
import type { AdminRelationship } from "@/lib/admin-relationships";
import { resolveAdminRelationshipRegistrationType } from "@/lib/admin-relationships";
import type { UnlinkRequest } from "@/lib/customer-access";
import { resolveCustomerProfileId } from "@/lib/services/customerService";
import { resolveDesignerProfileId } from "@/lib/services/designerService";
import { patchCustomerLink } from "@/lib/services/customerService";
import { syncCustomerLinkFromRequest } from "@/lib/customer-access";

export async function listUnlinkRequests(): Promise<UnlinkRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("unlink_requests")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapUnlinkRequest);
}

export async function createUnlinkRequest(input: {
  customerLegacyId: string;
  customerName: string;
  designerLegacyId: string;
  designerName: string;
  reason: string;
}) {
  const supabase = createClient();
  const customerId = await resolveCustomerProfileId(input.customerLegacyId);
  const designerId = await resolveDesignerProfileId(input.designerLegacyId);
  if (!customerId || !designerId) throw new Error("Unable to resolve participants");

  const submittedAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const { data, error } = await supabase
    .from("unlink_requests")
    .insert({
      customer_id: customerId,
      customer_name: input.customerName,
      designer_id: designerId,
      designer_name: input.designerName,
      reason: input.reason,
      submitted_at: submittedAt,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await patchCustomerLink(customerId, {
    unlinkStatus: "pending",
    unlinkReason: input.reason,
    unlinkSubmittedAt: submittedAt,
    activeUnlinkRequestId: data.legacy_id ?? data.id,
  });

  return mapUnlinkRequest(data);
}

export async function updateUnlinkRequest(
  requestId: string,
  patch: Partial<UnlinkRequest>
) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("unlink_requests")
    .select("*")
    .or(legacyOrIdFilter(requestId))
    .maybeSingle();
  if (!existing) throw new Error("Request not found");

  const { data, error } = await supabase
    .from("unlink_requests")
    .update({
      status: patch.status,
      admin_notes: patch.adminNotes,
      admin_contacted_at: patch.adminContactedAt,
      designer_confirmation: patch.designerConfirmation,
      designer_response: patch.designerResponse,
      designer_responded_at: patch.designerRespondedAt,
    })
    .eq("id", existing.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const mapped = mapUnlinkRequest(data);
  const currentLink = await import("@/lib/services/customerService").then((m) =>
    m.getCustomerLinkState(existing.customer_id)
  );
  const next = syncCustomerLinkFromRequest(currentLink, mapped);
  await patchCustomerLink(existing.customer_id, next);

  return mapped;
}

type CustomerProfileRow = {
  id: string;
  legacy_id: string | null;
  name: string;
  email: string;
  registration_type: "invited" | "direct" | null;
  created_at: string;
  user_id: string | null;
};

type CustomerUserRow = {
  id: string;
  role: string;
  account_status: "active" | "suspended" | "banned" | null;
};

export async function listAdminRelationships(): Promise<AdminRelationship[]> {
  const supabase = createClient();

  const [
    { data: relationships, error: relationshipsError },
    { data: customerRows, error: customersError },
    { data: projects, error: projectsError },
    { data: acceptedInvites, error: invitesError },
  ] = await Promise.all([
    supabase
      .from("designer_customer_relationships")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_profiles")
      .select("id, legacy_id, name, email, registration_type, created_at, user_id")
      .order("name"),
    supabase.from("projects").select("designer_id, customer_id"),
    supabase.from("invite_codes").select("email").eq("status", "accepted"),
  ]);

  if (relationshipsError) throw new Error(relationshipsError.message);
  if (customersError) throw new Error(customersError.message);
  if (projectsError) throw new Error(projectsError.message);
  if (invitesError) throw new Error(invitesError.message);

  const customerUserIds = [
    ...new Set(
      (customerRows ?? [])
        .map((row) => row.user_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const { data: customerUsers, error: customerUsersError } = customerUserIds.length
    ? await supabase
        .from("users")
        .select("id, role, account_status")
        .in("id", customerUserIds)
        .eq("role", "customer")
    : { data: [] as CustomerUserRow[], error: null };

  if (customerUsersError) throw new Error(customerUsersError.message);

  const userById = new Map((customerUsers ?? []).map((row) => [row.id, row as CustomerUserRow]));

  const invitedEmails = new Set(
    (acceptedInvites ?? [])
      .map((invite) => invite.email?.trim().toLowerCase())
      .filter(Boolean)
  );

  const projectCountsByPair = new Map<string, number>();
  const projectCountsByCustomer = new Map<string, number>();
  for (const project of projects ?? []) {
    if (!project.customer_id) continue;
    projectCountsByCustomer.set(
      project.customer_id,
      (projectCountsByCustomer.get(project.customer_id) ?? 0) + 1
    );
    const pairKey = `${project.designer_id}:${project.customer_id}`;
    projectCountsByPair.set(pairKey, (projectCountsByPair.get(pairKey) ?? 0) + 1);
  }

  const customers = (customerRows ?? [])
    .filter((row) => row.user_id && userById.has(row.user_id))
    .map((row) => row as CustomerProfileRow);
  const customerById = new Map(customers.map((row) => [row.id, row]));

  const designerIds = [...new Set((relationships ?? []).map((row) => row.designer_id))];
  const { data: designers } = designerIds.length
    ? await supabase
        .from("designer_profiles")
        .select("id, legacy_id, business_name, designer_name")
        .in("id", designerIds)
    : { data: [] };

  const designerById = new Map((designers ?? []).map((row) => [row.id, row]));
  const customerIdsWithActiveLink = new Set(
    (relationships ?? []).filter((row) => row.is_active).map((row) => row.customer_id)
  );

  const rows: AdminRelationship[] = (relationships ?? []).map((row) => {
    const designer = designerById.get(row.designer_id);
    const customer = customerById.get(row.customer_id);
    const countKey = `${row.designer_id}:${row.customer_id}`;

    return {
      id: row.id,
      designerId: designer ? profileId(designer) : row.designer_id,
      designerName: designer?.business_name ?? "Unknown designer",
      customerId: customer ? profileId(customer) : row.customer_id,
      customerName: customer?.name ?? "Unknown client",
      registrationType: resolveAdminRelationshipRegistrationType({
        customerRegistrationType: customer?.registration_type,
        relationshipRegistrationType: row.registration_type,
        hasAcceptedInvite: Boolean(
          customer?.email && invitedEmails.has(customer.email.trim().toLowerCase())
        ),
      }),
      isActive: row.is_active,
      awaitingDesigner: false,
      createdAt: row.created_at,
      projectCount: projectCountsByPair.get(countKey) ?? 0,
    };
  });

  for (const customer of customers) {
    if (customerIdsWithActiveLink.has(customer.id)) continue;

    const accountStatus = customer.user_id
      ? (userById.get(customer.user_id)?.account_status ?? "active")
      : "active";
    if (accountStatus === "suspended" || accountStatus === "banned") continue;

    const registrationType = resolveAdminRelationshipRegistrationType({
      customerRegistrationType: customer.registration_type,
      hasAcceptedInvite: invitedEmails.has(customer.email.trim().toLowerCase()),
    });
    if (registrationType !== "direct") continue;

    rows.push({
      id: `awaiting-${customer.id}`,
      designerId: "",
      designerName: "Not linked yet",
      customerId: profileId(customer),
      customerName: customer.name,
      registrationType: "direct",
      isActive: true,
      awaitingDesigner: true,
      createdAt: customer.created_at,
      projectCount: projectCountsByCustomer.get(customer.id) ?? 0,
    });
  }

  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
