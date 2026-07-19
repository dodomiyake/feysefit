import type { UserRole } from "@/lib/design-tokens";

const ROLE_STORAGE_KEY = "feysefit_role";

export function readStoredRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ROLE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserRole;
    return parsed === "designer" || parsed === "customer" || parsed === "admin" ? parsed : null;
  } catch {
    return null;
  }
}

/** Resolve dashboard path from the active user role (context only — no storage reads during render). */
export function getDashboardHref(role: UserRole | null): string {
  switch (role) {
    case "designer":
      return "/dashboard/designer";
    case "customer":
      return "/dashboard/customer";
    case "admin":
      return "/dashboard/admin";
    default:
      return "/login";
  }
}
