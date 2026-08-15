import { createClient } from "@/lib/supabase/client";
import { runSensitiveAction } from "@/lib/security/sensitive-rate-limit";

export interface AdminTeamMember {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export async function listAdminTeamMembers(): Promise<AdminTeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  }));
}

export async function grantAdminAccess(email: string): Promise<AdminTeamMember> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("Enter an email address.");

  const supabase = createClient();
  const { data: user, error: lookupError } = await supabase
    .from("users")
    .select("id, email, name, role, created_at")
    .eq("email", normalized)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  if (!user) {
    throw new Error(
      "No FeyseFit account exists for that email. Create the user in Supabase Authentication first, or ask them to sign up, then grant access here."
    );
  }

  if (user.role === "admin") {
    throw new Error("This user already has admin portal access.");
  }

  const { data: updated, error: updateError } = await runSensitiveAction(
    "adminMutation",
    user.id,
    () =>
      supabase
        .from("users")
        .update({ role: "admin" })
        .eq("id", user.id)
        .select("id, email, name, created_at")
        .single()
  );
  if (updateError) throw new Error(updateError.message);

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    createdAt: updated.created_at,
  };
}

export async function revokeAdminAccess(userId: string, actingAdminId: string) {
  if (userId === actingAdminId) {
    throw new Error("You cannot revoke your own admin access.");
  }

  const supabase = createClient();
  const { data: admins, error: listError } = await supabase
    .from("users")
    .select("id")
    .eq("role", "admin");
  if (listError) throw new Error(listError.message);
  if ((admins ?? []).length <= 1) {
    throw new Error("At least one admin must keep portal access.");
  }

  const { data: target, error: targetError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (targetError) throw new Error(targetError.message);
  if (!target || target.role !== "admin") {
    throw new Error("This user does not have admin access.");
  }

  const [{ data: profiles, error: profileLookupError }] = await Promise.all([
    supabase.rpc("admin_lookup_profiles_by_user_ids", { p_user_ids: [userId] }),
  ]);
  if (profileLookupError) throw new Error(profileLookupError.message);
  const match = profiles?.[0];
  const restoreRole = match?.designer_id ? "designer" : match?.customer_id ? "customer" : "customer";

  const { error: updateError } = await runSensitiveAction("adminMutation", userId, () =>
    supabase.from("users").update({ role: restoreRole }).eq("id", userId)
  );
  if (updateError) throw new Error(updateError.message);
}
