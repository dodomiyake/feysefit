import { createClient } from "@/lib/supabase/client";
import { isSupabaseEnabled } from "@/lib/config/backend";

const STORAGE_KEY = "feysefit_user_preferences";

export type ProfileVisibility = "connections" | "everyone";

export interface UserPreferences {
  measurementUnit: "inches" | "cm";
  emailDigests: boolean;
  pushAlerts: boolean;
  profileVisibility: ProfileVisibility;
  twoFactorEnabled: boolean;
}

export const defaultUserPreferences: UserPreferences = {
  measurementUnit: "inches",
  emailDigests: true,
  pushAlerts: true,
  profileVisibility: "connections",
  twoFactorEnabled: false,
};

function loadLocalPreferences(userId?: string): UserPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, UserPreferences>;
    if (userId && parsed[userId]) return parsed[userId];
    if (!userId && parsed.default) return parsed.default;
  } catch {
    // ignore corrupt storage
  }
  return null;
}

function saveLocalPreferences(userId: string, prefs: UserPreferences) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, UserPreferences>) : {};
    parsed[userId] = prefs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore quota errors
  }
}

function mapRow(row: {
  measurement_unit: string;
  email_digests: boolean;
  push_alerts: boolean;
  profile_visibility: string;
  two_factor_enabled: boolean;
}): UserPreferences {
  return {
    measurementUnit: row.measurement_unit === "cm" ? "cm" : "inches",
    emailDigests: row.email_digests,
    pushAlerts: row.push_alerts,
    profileVisibility: row.profile_visibility === "everyone" ? "everyone" : "connections",
    twoFactorEnabled: row.two_factor_enabled,
  };
}

export async function getUserPreferences(userId?: string): Promise<UserPreferences> {
  if (!userId) {
    return loadLocalPreferences() ?? defaultUserPreferences;
  }

  if (!isSupabaseEnabled()) {
    return loadLocalPreferences(userId) ?? defaultUserPreferences;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Could not load user preferences", error.message);
    return loadLocalPreferences(userId) ?? defaultUserPreferences;
  }

  if (!data) {
    return loadLocalPreferences(userId) ?? defaultUserPreferences;
  }

  return mapRow(data);
}

export async function upsertUserPreferences(
  userId: string,
  patch: Partial<UserPreferences>
): Promise<UserPreferences> {
  const current = await getUserPreferences(userId);
  const next: UserPreferences = {
    measurementUnit: patch.measurementUnit ?? current.measurementUnit,
    emailDigests: patch.emailDigests ?? current.emailDigests,
    pushAlerts: patch.pushAlerts ?? current.pushAlerts,
    profileVisibility: patch.profileVisibility ?? current.profileVisibility,
    twoFactorEnabled: patch.twoFactorEnabled ?? current.twoFactorEnabled,
  };

  if (!isSupabaseEnabled()) {
    saveLocalPreferences(userId, next);
    return next;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        measurement_unit: next.measurementUnit,
        email_digests: next.emailDigests,
        push_alerts: next.pushAlerts,
        profile_visibility: next.profileVisibility,
        two_factor_enabled: next.twoFactorEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  saveLocalPreferences(userId, next);
  return mapRow(data);
}
