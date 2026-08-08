export type BackendMode = "supabase" | "api" | "demo";

function enabled(value: string | undefined) {
  return value === "true";
}

/**
 * Resolve the active data backend.
 *
 * Configuration is intentionally fail-closed: FeyseFit must never infer demo
 * mode merely because production environment variables are missing.
 */
export function getBackendMode(): BackendMode {
  const modes: Array<[BackendMode, boolean]> = [
    ["supabase", enabled(process.env.NEXT_PUBLIC_USE_SUPABASE)],
    ["api", enabled(process.env.NEXT_PUBLIC_USE_API)],
    ["demo", enabled(process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE)],
  ];
  const active = modes.filter(([, isEnabled]) => isEnabled).map(([mode]) => mode);

  if (active.length !== 1) {
    throw new Error(
      active.length === 0
        ? "FeyseFit backend is not configured. Enable exactly one of NEXT_PUBLIC_USE_SUPABASE, NEXT_PUBLIC_USE_API, or NEXT_PUBLIC_ENABLE_DEMO_MODE."
        : `FeyseFit backend configuration is ambiguous. Enabled modes: ${active.join(", ")}. Enable exactly one backend.`
    );
  }

  if (active[0] === "demo" && process.env.NODE_ENV === "production") {
    throw new Error("FeyseFit demo mode is disabled in production.");
  }

  return active[0];
}

export function isSupabaseEnabled() {
  return getBackendMode() === "supabase";
}

export function isApiEnabled() {
  return getBackendMode() === "api";
}

export function isLocalDemoMode() {
  return getBackendMode() === "demo";
}

/** One-click demo credentials are restricted to explicit, non-production demo mode. */
export function isDemoAuthAllowed() {
  return process.env.NODE_ENV !== "production" && isLocalDemoMode();
}
