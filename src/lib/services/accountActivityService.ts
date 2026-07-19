import { createClient } from "@/lib/supabase/client";
import type { AccountActivityType } from "@/lib/account-activity";

export interface AccountActivityRow {
  id: string;
  eventType: AccountActivityType | string;
  ipHint: string | null;
  deviceHint: string | null;
  createdAt: string;
}

export async function listMyAccountActivity(limit = 40): Promise<AccountActivityRow[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("account_activity")
    .select("id, event_type, ip_hint, device_hint, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    eventType: row.event_type,
    ipHint: row.ip_hint,
    deviceHint: row.device_hint,
    createdAt: row.created_at,
  }));
}

export async function getPasswordChangedAt(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("password_changed_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.password_changed_at ?? null;
}
