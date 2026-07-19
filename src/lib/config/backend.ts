export function isSupabaseEnabled() {
  return process.env.NEXT_PUBLIC_USE_SUPABASE === "true";
}

export function isApiEnabled() {
  return !isSupabaseEnabled() && process.env.NEXT_PUBLIC_USE_API === "true";
}

export function isLocalDemoMode() {
  return !isSupabaseEnabled() && !isApiEnabled();
}

/** One-click demo credentials — development / local mode only. */
export function isDemoAuthAllowed() {
  return isLocalDemoMode() || process.env.NODE_ENV === "development";
}

