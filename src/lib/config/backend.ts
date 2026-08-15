export function isSupabaseEnabled() {
  return process.env.NEXT_PUBLIC_USE_SUPABASE === "true";
}

export function isApiEnabled() {
  if (isSupabaseEnabled()) return false;
  return process.env.USE_LEGACY_API === "true";
}

export function isLocalDemoMode() {
  return !isSupabaseEnabled() && !isApiEnabled();
}

/** One-click demo credentials — development / local mode only. */
export function isDemoAuthAllowed() {
  return isLocalDemoMode() || process.env.NODE_ENV === "development";
}

